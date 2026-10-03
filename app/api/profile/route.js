import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateContactNumber, validateUsername } from '@/lib/utils/validation';
import { isSuperAdminEmail } from '@/lib/config/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase configuration missing.' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const adminClient = createAdminClient() || supabase;
    const email = user.email?.toLowerCase();

    let { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile && email) {
      const { data: profileByEmail } = await adminClient
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      profile = profileByEmail;
    }

    return NextResponse.json({
      success: true,
      profile: profile || null,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: 'Failed to retrieve profile.' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase configuration missing.' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { first_name, last_name, full_name, username, contact_number, avatar_url } = body;

    // Validate contact number if provided
    if (contact_number !== undefined && contact_number !== null && contact_number.trim() !== '') {
      const contactError = validateContactNumber(contact_number);
      if (contactError) {
        return NextResponse.json({ error: contactError }, { status: 400 });
      }
    }

    // Validate username if provided
    if (username !== undefined && username !== null && username.trim() !== '') {
      const usernameError = validateUsername(username);
      if (usernameError) {
        return NextResponse.json({ error: usernameError }, { status: 400 });
      }
    }

    // Validate name lengths
    if (first_name && first_name.trim().length > 50) {
      return NextResponse.json({ error: 'First name cannot exceed 50 characters.' }, { status: 400 });
    }
    if (last_name && last_name.trim().length > 50) {
      return NextResponse.json({ error: 'Last name cannot exceed 50 characters.' }, { status: 400 });
    }

    const trimmedFirst = first_name !== undefined ? (first_name?.trim() || null) : undefined;
    const trimmedLast = last_name !== undefined ? (last_name?.trim() || null) : undefined;
    
    let computedFullName = full_name?.trim();
    if (!computedFullName && (trimmedFirst || trimmedLast)) {
      computedFullName = `${trimmedFirst || ''} ${trimmedLast || ''}`.trim();
    }

    const adminClient = createAdminClient() || supabase;
    const email = user.email?.toLowerCase();
    const isSuperAdmin = isSuperAdminEmail(email);

    // Find existing profile
    let { data: existingProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!existingProfile && email) {
      const { data: profileByEmail } = await adminClient
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      existingProfile = profileByEmail;
    }

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (trimmedFirst !== undefined) updatePayload.first_name = trimmedFirst;
    if (trimmedLast !== undefined) updatePayload.last_name = trimmedLast;
    if (computedFullName !== undefined) updatePayload.full_name = computedFullName;
    if (username !== undefined) updatePayload.username = username?.trim() || null;
    if (contact_number !== undefined) updatePayload.contact_number = contact_number?.trim() || null;
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url?.trim() || null;

    let savedProfile = null;

    if (existingProfile) {
      const { data, error: updateError } = await adminClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update profile error:', updateError);
        return NextResponse.json({ error: 'Failed to update profile: ' + updateError.message }, { status: 500 });
      }
      savedProfile = data;
    } else {
      // Upsert/Create profile if it didn't exist yet
      const insertPayload = {
        auth_user_id: user.id,
        email: email,
        full_name: computedFullName || user.user_metadata?.full_name || 'FinLITE Member',
        first_name: trimmedFirst || null,
        last_name: trimmedLast || null,
        username: username?.trim() || null,
        contact_number: contact_number?.trim() || null,
        avatar_url: avatar_url?.trim() || user.user_metadata?.avatar_url || null,
        role: isSuperAdmin ? 'admin' : 'member',
        status: isSuperAdmin ? 'approved' : 'pending',
        auth_provider: user.app_metadata?.provider || 'email',
        ...updatePayload,
      };

      const { data, error: insertError } = await adminClient
        .from('profiles')
        .insert([insertPayload])
        .select()
        .single();

      if (insertError) {
        console.error('Insert profile error:', insertError);
        return NextResponse.json({ error: 'Failed to create profile: ' + insertError.message }, { status: 500 });
      }
      savedProfile = data;
    }

    // Sync auth user metadata if possible
    try {
      const authMetadata = {};
      if (computedFullName) authMetadata.full_name = computedFullName;
      if (avatar_url) authMetadata.avatar_url = avatar_url;
      if (trimmedFirst) authMetadata.first_name = trimmedFirst;
      if (trimmedLast) authMetadata.last_name = trimmedLast;

      if (Object.keys(authMetadata).length > 0) {
        await supabase.auth.updateUser({ data: authMetadata });
      }
    } catch (metaErr) {
      console.warn('Auth user metadata sync warning:', metaErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: savedProfile,
    });
  } catch (err) {
    console.error('PATCH /api/profile error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred while updating profile.' }, { status: 500 });
  }
}

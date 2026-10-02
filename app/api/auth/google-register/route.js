import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateContactNumber } from '@/lib/utils/validation';

// POST /api/auth/google-register
// Called when a new Google OAuth user completes profile setup
export async function POST(req) {
  try {
    const { firstName, lastName, username, email, contactNumber, googleUid, avatarUrl } = await req.json();

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'First name, last name, and email are required.' }, { status: 400 });
    }

    const contactError = validateContactNumber(contactNumber);
    if (contactError) {
      return NextResponse.json({ error: contactError }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const fallbackUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
    const finalUsername = (username?.trim() || fallbackUsername).toLowerCase();

    const adminClient = createAdminClient();
    const supabase = await createClient();
    const queryClient = adminClient || supabase;

    // Check for duplicate registration request by email
    const { data: dup } = await queryClient
      .from('registration_requests')
      .select('id, email, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dup) {
      return NextResponse.json({
        error: 'A registration request with this Gmail already exists. Please wait for admin approval.',
      }, { status: 409 });
    }

    // Insert registration request
    const insertClient = adminClient || supabase;
    const { data: request, error } = await insertClient
      .from('registration_requests')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: finalUsername,
        email: cleanEmail,
        contact_number: contactNumber?.trim() || null,
        auth_provider: 'google',
        google_id: googleUid || null,
        avatar_url: avatarUrl || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique')) {
        return NextResponse.json({
          error: 'A registration request with this Gmail address or username already exists.',
        }, { status: 409 });
      }
      console.error('Google register insert error:', error);
      return NextResponse.json({ error: 'Failed to submit registration. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your profile has been submitted for admin approval.',
      requestId: request.id,
    });
  } catch (err) {
    console.error('Google register API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

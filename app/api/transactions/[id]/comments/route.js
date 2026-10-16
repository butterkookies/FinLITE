import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET /api/transactions/[id]/comments — Fetch comments thread for a transaction
export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const transactionId = resolvedParams?.id;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    // 1. Primary attempt: relational join with author profile
    let comments = null;
    let queryError = null;

    const { data: joinedComments, error: joinErr } = await supabase
      .from('transaction_comments')
      .select(`
        id,
        transaction_id,
        user_id,
        comment,
        created_at,
        profiles (
          id,
          full_name,
          first_name,
          last_name,
          role,
          avatar_url,
          email
        )
      `)
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true });

    if (!joinErr && Array.isArray(joinedComments)) {
      comments = joinedComments;
    } else {
      queryError = joinErr;
      console.warn('Relational comments fetch warning, attempting flat select fallback:', joinErr?.message);

      // 2. Resilient Fallback: Flat select + in-memory profile mapping
      const { data: flatComments, error: flatErr } = await supabase
        .from('transaction_comments')
        .select('id, transaction_id, user_id, comment, created_at')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });

      if (flatErr) {
        console.error('Flat comments query also failed:', flatErr);
        return NextResponse.json({ 
          error: flatErr.message || 'Failed to fetch remarks.',
          code: flatErr.code,
          details: flatErr.details
        }, { status: 500 });
      }

      // Enrich with profiles
      const userIds = [...new Set((flatComments || []).map((c) => c.user_id).filter(Boolean))];
      const profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, role, avatar_url, email')
          .in('id', userIds);
        (profs || []).forEach((p) => profileMap.set(p.id, p));
      }

      comments = (flatComments || []).map((c) => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
      }));
    }

    const normalized = (comments || []).map((c) => ({
      id: c.id,
      transaction_id: c.transaction_id,
      user_id: c.user_id,
      comment: c.comment,
      created_at: c.created_at,
      author_name: c.profiles?.full_name || 
        (c.profiles?.first_name ? `${c.profiles.first_name} ${c.profiles.last_name || ''}`.trim() : null) || 
        'Officer',
      author_role: c.profiles?.role || 'officer',
      author_email: c.profiles?.email || null,
      author_avatar: c.profiles?.avatar_url || null,
    }));

    return NextResponse.json({
      success: true,
      comments: normalized,
      count: normalized.length,
    });
  } catch (err) {
    console.error('Transaction comments GET error:', err);
    return NextResponse.json({ 
      error: err.message || 'Server error retrieving remarks.',
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    }, { status: 500 });
  }
}

// POST /api/transactions/[id]/comments — Add an auditor remark or officer instruction
export async function POST(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const transactionId = resolvedParams?.id;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required to post remarks.' }, { status: 401 });
    }

    const { comment } = await req.json();
    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ error: 'Comment text cannot be empty.' }, { status: 400 });
    }

    // 1. Verify that the transaction actually exists in the database to prevent foreign key errors
    const { data: txRecord, error: txCheckErr } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', transactionId)
      .maybeSingle();

    if (txCheckErr) {
      console.warn('Transaction existence check warning:', txCheckErr.message);
    }

    if (!txRecord && !txCheckErr) {
      return NextResponse.json({ 
        error: 'Transaction record not found in ledger database. The record may have been rolled over or removed.' 
      }, { status: 404 });
    }

    // 2. Resolve author profile with automatic identity linking
    const adminClient = createAdminClient();
    const queryClient = adminClient || supabase;

    // Trigger self-healing RPC if available
    try {
      await supabase.rpc('link_current_user_profile');
    } catch (_) {}

    let { data: profile } = await queryClient
      .from('profiles')
      .select('id, full_name, first_name, last_name, role, avatar_url, email, auth_user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile && user.email) {
      const { data: profileByEmail } = await queryClient
        .from('profiles')
        .select('id, full_name, first_name, last_name, role, avatar_url, email, auth_user_id')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (profileByEmail) {
        profile = profileByEmail;
        // Self-heal: Link auth_user_id if unlinked
        if (!profileByEmail.auth_user_id || profileByEmail.auth_user_id !== user.id) {
          try {
            await (adminClient || supabase)
              .from('profiles')
              .update({ auth_user_id: user.id })
              .eq('id', profileByEmail.id);
          } catch (linkErr) {
            console.warn('Profile auth_user_id self-heal note:', linkErr?.message);
          }
        }
      }
    }

    if (!profile) {
      return NextResponse.json({ 
        error: 'Officer profile not found. Please re-authenticate or verify your registration with an admin.' 
      }, { status: 403 });
    }

    // 3. Insert remark into transaction_comments
    // Use adminClient if available to avoid RLS desync, otherwise use authenticated user client
    const insertClient = adminClient || supabase;
    const { data: inserted, error: insertError } = await insertClient
      .from('transaction_comments')
      .insert([{
        transaction_id: transactionId,
        user_id: profile.id,
        comment: comment.trim(),
      }])
      .select('id, transaction_id, user_id, comment, created_at')
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);

      let userFriendlyMessage = 'Failed to post remark. Please try again.';
      if (insertError.code === '42501' || insertError.message?.toLowerCase().includes('row-level security')) {
        userFriendlyMessage = 'Database permission check failed: your login session is not yet linked to an authorized officer profile, or migration 021 must be applied in Supabase.';
      } else if (insertError.message) {
        userFriendlyMessage = insertError.message;
      }

      return NextResponse.json({ 
        error: userFriendlyMessage,
        code: insertError.code,
        details: insertError.details,
      }, { status: insertError.code === '42501' ? 403 : 500 });
    }

    // 4. Construct normalized comment response directly with verified author profile in memory
    const normalized = {
      id: inserted.id,
      transaction_id: inserted.transaction_id,
      user_id: inserted.user_id,
      comment: inserted.comment,
      created_at: inserted.created_at,
      author_name: profile.full_name || 
        (profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : null) || 
        'Officer',
      author_role: profile.role || 'officer',
      author_email: profile.email || null,
      author_avatar: profile.avatar_url || null,
    };

    // 5. Telemetry: record audit event
    try {
      await supabase.from('audit_logs').insert([{
        user_id: profile.id,
        action: 'COMMENT_ADDED',
        entity_type: 'transaction_comments',
        entity_id: inserted.id,
        details: {
          transaction_id: transactionId,
          comment_excerpt: comment.trim().slice(0, 80),
          author: normalized.author_name,
          role: normalized.author_role,
        },
      }]);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      comment: normalized,
    });
  } catch (err) {
    console.error('Transaction comments POST error:', err);
    return NextResponse.json({ 
      error: err.message || 'Server error saving remark.',
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    }, { status: 500 });
  }
}

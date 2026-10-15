import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: comments, error } = await supabase
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

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch remarks.' }, { status: 500 });
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
    return NextResponse.json({ error: 'Server error retrieving remarks.' }, { status: 500 });
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

    // Resolve author profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, role, avatar_url, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile && user.email) {
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, role, avatar_url, email')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();
      if (profileByEmail) profile = profileByEmail;
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found. Please re-authenticate.' }, { status: 403 });
    }

    // Insert remark
    const { data: inserted, error: insertError } = await supabase
      .from('transaction_comments')
      .insert([{
        transaction_id: transactionId,
        user_id: profile.id,
        comment: comment.trim(),
      }])
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
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json({ error: 'Failed to post remark.' }, { status: 500 });
    }

    const normalized = {
      id: inserted.id,
      transaction_id: inserted.transaction_id,
      user_id: inserted.user_id,
      comment: inserted.comment,
      created_at: inserted.created_at,
      author_name: inserted.profiles?.full_name || 
        (inserted.profiles?.first_name ? `${inserted.profiles.first_name} ${inserted.profiles.last_name || ''}`.trim() : null) || 
        'Officer',
      author_role: inserted.profiles?.role || 'officer',
      author_email: inserted.profiles?.email || null,
      author_avatar: inserted.profiles?.avatar_url || null,
    };

    // Telemetry: record audit event
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
    return NextResponse.json({ error: 'Server error saving remark.' }, { status: 500 });
  }
}

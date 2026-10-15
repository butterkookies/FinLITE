import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/transactions/comments-count — Fetch aggregated comment counts per transaction
export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: true, counts: {} });
    }

    const { data, error } = await supabase
      .from('transaction_comments')
      .select('transaction_id');

    if (error) {
      console.warn('Comment counts query warning:', error.message);
      return NextResponse.json({ success: true, counts: {} });
    }

    const counts = {};
    (data || []).forEach((row) => {
      if (row.transaction_id) {
        counts[row.transaction_id] = (counts[row.transaction_id] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      counts,
    });
  } catch (err) {
    console.error('Comments count API error:', err);
    return NextResponse.json({ success: true, counts: {} });
  }
}

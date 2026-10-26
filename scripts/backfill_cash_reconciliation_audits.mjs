import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function backfill() {
  console.log('Fetching existing cash_reconciliations...');
  const { data: reconciliations, error: rErr } = await sb
    .from('cash_reconciliations')
    .select(`
      *,
      cash_reconciliation_items (
        quantity,
        subtotal,
        denominations (
          code,
          label,
          face_value
        )
      )
    `)
    .order('created_at', { ascending: true });

  if (rErr) {
    console.error('Error fetching reconciliations:', rErr);
    return;
  }

  console.log(`Found ${reconciliations.length} cash reconciliation sessions.`);

  // Check valid profile IDs to prevent foreign key errors on user_id
  const { data: profiles } = await sb.from('profiles').select('id');
  const validProfileIds = new Set((profiles || []).map((p) => p.id));

  let insertedCount = 0;
  for (const recon of reconciliations) {
    // Check if already in audit_logs
    const { data: existing } = await sb
      .from('audit_logs')
      .select('id')
      .eq('entity_type', 'cash_reconciliations')
      .eq('entity_id', recon.id)
      .maybeSingle();

    if (existing) {
      console.log(`Skipping reconciliation ${recon.id} (already audited).`);
      continue;
    }

    const varAmt = Number(recon.variance_amount || 0);
    const isShortage = varAmt < 0 || recon.variance_status === 'SHORTAGE';
    const isOverage = varAmt > 0 || recon.variance_status === 'OVERAGE';
    const action = isShortage 
      ? 'CASHBOX_SHORTAGE_DECLARED' 
      : isOverage 
        ? 'CASHBOX_OVERAGE_DECLARED' 
        : 'CASHBOX_RECONCILED';

    const userId = validProfileIds.has(recon.counted_by) ? recon.counted_by : null;

    const items = (recon.cash_reconciliation_items || []).map((it) => ({
      code: it.denominations?.code || 'CURRENCY',
      label: it.denominations?.label || '',
      face_value: it.denominations?.face_value || 0,
      quantity: it.quantity || 0,
      subtotal: it.subtotal || 0,
    }));

    const auditRow = {
      action,
      entity_type: 'cash_reconciliations',
      entity_id: recon.id,
      user_id: userId,
      created_at: recon.created_at || recon.reconciliation_date,
      details: {
        physical_total: Number(recon.physical_total) || 0,
        system_total: Number(recon.ledger_cash_balance) || 0,
        ledger_cash_balance: Number(recon.ledger_cash_balance) || 0,
        variance: varAmt,
        variance_amount: varAmt,
        variance_status: recon.variance_status || 'BALANCED',
        approval_status: recon.approval_status || 'BALANCED',
        notes: recon.notes || null,
        items,
        snapshot: {
          title: `Physical Cashbox Count (${recon.variance_status || 'BALANCED'})`,
          physical_total: Number(recon.physical_total) || 0,
          system_total: Number(recon.ledger_cash_balance) || 0,
          ledger_cash_balance: Number(recon.ledger_cash_balance) || 0,
          variance: varAmt,
          variance_amount: varAmt,
          variance_status: recon.variance_status || 'BALANCED',
          approval_status: recon.approval_status || 'BALANCED',
          notes: recon.notes || null,
          items,
        },
      },
    };

    const { error: insErr } = await sb.from('audit_logs').insert([auditRow]);
    if (insErr) {
      console.error(`Failed to insert audit log for ${recon.id}:`, insErr);
    } else {
      console.log(`[+] Audited reconciliation ${recon.id} (${action}) - Physical: ₱${recon.physical_total}, Var: ₱${varAmt}`);
      insertedCount++;
    }
  }

  console.log(`\nBackfill completed! Successfully inserted ${insertedCount} cash count audit records.`);
}

backfill();

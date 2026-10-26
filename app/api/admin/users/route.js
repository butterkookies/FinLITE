import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAccountStatusChangedEmail } from '@/lib/email/mailer';
import { ACTION_KEYS, resolveUserPermissions } from '@/lib/auth/permissions';

const VALID_ROLES = ['treasurer', 'auditor', 'president', 'vice_president', 'adviser', 'admin'];
const SINGLE_HOLDER_CUSTODIAN_ROLES = ['treasurer', 'auditor'];

// GET /api/admin/users — list approved members or check ledger dependencies
export async function GET(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const checkDeps = searchParams.get('checkDeps') === 'true';
    const checkUserId = searchParams.get('userId');
    const supabase = auth.supabase;
    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    // Check financial ledger dependencies for account removal
    if (checkDeps && checkUserId) {
      const [
        { count: txCount },
        { count: countedCount },
        { count: verifiedCount },
        { count: commentCount },
        { count: debtCount },
        { count: advanceCount },
      ] = await Promise.all([
        db.from('transactions').select('id', { count: 'exact', head: true }).eq('logged_by', checkUserId),
        db.from('cash_reconciliations').select('id', { count: 'exact', head: true }).eq('counted_by', checkUserId),
        db.from('cash_reconciliations').select('id', { count: 'exact', head: true }).eq('verified_by', checkUserId),
        db.from('transaction_comments').select('id', { count: 'exact', head: true }).eq('user_id', checkUserId),
        db.from('debts_receivables').select('id', { count: 'exact', head: true }).eq('created_by', checkUserId),
        db.from('advances_payable').select('id', { count: 'exact', head: true }).eq('created_by', checkUserId),
      ]);

      const totalLedgerOps =
        (txCount || 0) +
        (countedCount || 0) +
        (verifiedCount || 0) +
        (commentCount || 0) +
        (debtCount || 0) +
        (advanceCount || 0);

      return NextResponse.json({
        success: true,
        canDelete: totalLedgerOps === 0,
        transactionCount: totalLedgerOps,
        breakdown: {
          transactions: txCount || 0,
          cashReconciliations: (countedCount || 0) + (verifiedCount || 0),
          comments: commentCount || 0,
          debts: debtCount || 0,
          advances: advanceCount || 0,
        },
      });
    }

    // List all users with graceful fallback if permissions column does not exist yet (migration 031 pending)
    let { data: users, error } = await db
      .from('profiles')
      .select('id, auth_user_id, full_name, first_name, last_name, email, role, status, contact_number, auth_provider, avatar_url, permissions, created_at, approved_at')
      .order('created_at', { ascending: false });

    if (error && (error.code === '42703' || error.message?.includes('permissions'))) {
      const fallback = await db
        .from('profiles')
        .select('id, auth_user_id, full_name, first_name, last_name, email, role, status, contact_number, auth_provider, avatar_url, created_at, approved_at')
        .order('created_at', { ascending: false });

      users = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
    }

    const resolvedUsers = (users || []).map((u) => ({
      ...u,
      permissions: resolveUserPermissions(u, u.email),
    }));

    return NextResponse.json({
      success: true,
      users: resolvedUsers,
    });
  } catch (err) {
    console.error('Admin users API error:', err);
    return NextResponse.json({ error: 'Server error retrieving users.' }, { status: 500 });
  }
}

// PATCH /api/admin/users — update a user's role or access status (ACTIVE vs SUSPENDED)
export async function PATCH(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { userId, role, status, permissions } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (!role && !status && permissions === undefined) {
      return NextResponse.json({ error: 'Either new role, status, or permissions must be specified.' }, { status: 400 });
    }

    const supabase = auth.supabase;
    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    // Fetch existing profile to enforce Super Admin Immutable Lock
    const { data: existingUser, error: fetchErr } = await db
      .from('profiles')
      .select('id, email, role, status, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !existingUser) {
      return NextResponse.json({ error: 'Target user account not found.' }, { status: 404 });
    }

    const isTargetSuperAdmin = isSuperAdminEmail(existingUser.email);
    const updates = { updated_at: new Date().toISOString() };
    const auditActions = [];

    // Role update validation
    if (role) {
      const normalizedRole = role.toLowerCase();
      if (!VALID_ROLES.includes(normalizedRole)) {
        return NextResponse.json({ error: `Invalid role specified. Allowed: ${VALID_ROLES.join(', ')}` }, { status: 400 });
      }

      if (isTargetSuperAdmin && normalizedRole !== 'admin') {
        return NextResponse.json({ error: 'Primary Super Admin account role cannot be changed from Admin.' }, { status: 403 });
      }

      updates.role = normalizedRole;
      auditActions.push({
        action: 'ROLE_UPDATE',
        entity_type: 'profiles',
        entity_id: userId,
        details: {
          previous_role: existingUser.role,
          new_role: normalizedRole,
          target_email: existingUser.email,
        },
      });
    }

    // Status update validation (ACTIVE vs SUSPENDED)
    if (status) {
      const normalizedStatusInput = String(status).toUpperCase();
      let dbStatus;
      if (normalizedStatusInput === 'ACTIVE' || normalizedStatusInput === 'APPROVED') {
        dbStatus = 'approved';
      } else if (normalizedStatusInput === 'SUSPENDED') {
        dbStatus = 'suspended';
      } else {
        return NextResponse.json({ error: 'Invalid status. Allowed values: ACTIVE, SUSPENDED' }, { status: 400 });
      }

      // Super Admin Immutable Lock: cannot deactivate or suspend
      if (isTargetSuperAdmin && dbStatus === 'suspended') {
        return NextResponse.json({ error: 'Primary Super Admin account is permanently locked and cannot be suspended.' }, { status: 403 });
      }

      updates.status = dbStatus;
      auditActions.push({
        action: 'STATUS_UPDATE',
        entity_type: 'profiles',
        entity_id: userId,
        details: {
          previous_status: existingUser.status,
          new_status: dbStatus,
          target_email: existingUser.email,
        },
      });
    }

    // Granular permissions update validation & sanitization
    if (permissions !== undefined && permissions !== null && typeof permissions === 'object') {
      const sanitizedPermissions = {};
      const validKeys = Object.values(ACTION_KEYS);
      for (const key of validKeys) {
        if (typeof permissions[key] === 'boolean') {
          sanitizedPermissions[key] = permissions[key];
        }
      }
      updates.permissions = sanitizedPermissions;
      auditActions.push({
        action: 'PERMISSIONS_UPDATE',
        entity_type: 'profiles',
        entity_id: userId,
        details: {
          target_email: existingUser.email,
          permissions: sanitizedPermissions,
        },
      });
    }

    // Role Mutual Exclusion & Segregation of Duties Validation (Use Case 2.5.5, p. 27)
    const effectiveRole = (updates.role || existingUser.role || '').toLowerCase();
    const effectiveStatus = updates.status || existingUser.status || 'approved';
    const roleOrStatusChanged =
      (updates.role && updates.role !== existingUser.role) ||
      (updates.status && updates.status !== existingUser.status);

    if (
      roleOrStatusChanged &&
      effectiveStatus === 'approved' &&
      SINGLE_HOLDER_CUSTODIAN_ROLES.includes(effectiveRole) &&
      !body.replaceExisting
    ) {
      const { data: existingHolders } = await db
        .from('profiles')
        .select('id, email, full_name, role, status')
        .eq('role', effectiveRole)
        .eq('status', 'approved')
        .neq('id', userId);

      if (existingHolders && existingHolders.length > 0) {
        const holder = existingHolders[0];
        return NextResponse.json(
          {
            error: `Role Mutual Exclusion Conflict: Another active officer (${holder.full_name || holder.email}) already holds the ${effectiveRole.toUpperCase()} role. Please suspend or reassign the existing ${effectiveRole} first.`,
            code: 'ROLE_MUTUAL_EXCLUSION_CONFLICT',
            conflictingUser: holder,
          },
          { status: 409 }
        );
      }
    }

    if (
      updates.permissions &&
      effectiveRole !== 'admin' &&
      !isTargetSuperAdmin &&
      !body.allowSegregationOverride
    ) {
      if (effectiveRole === 'treasurer' && updates.permissions[ACTION_KEYS.AUDIT_APPROVE] === true) {
        return NextResponse.json(
          {
            error: 'Role Mutual Exclusion Conflict: The Treasurer (financial custodian) cannot simultaneously hold Audit & Approve authority due to segregation of duties.',
            code: 'SEGREGATION_OF_DUTIES_CONFLICT',
          },
          { status: 409 }
        );
      }
      if (
        effectiveRole === 'auditor' &&
        (updates.permissions[ACTION_KEYS.RECORD_INFLOW] === true ||
          updates.permissions[ACTION_KEYS.RECORD_OUTFLOW] === true)
      ) {
        return NextResponse.json(
          {
            error: 'Role Mutual Exclusion Conflict: The Auditor cannot simultaneously hold Inflow/Outflow custodian recording authority due to segregation of duties.',
            code: 'SEGREGATION_OF_DUTIES_CONFLICT',
          },
          { status: 409 }
        );
      }
    }

    // Apply updates
    let { data: updated, error: updateErr } = await db
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    // If update failed because permissions column does not exist yet in DB
    if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('permissions'))) {
      if (updates.permissions && !updates.role && !updates.status) {
        return NextResponse.json({
          error: "Database column 'permissions' does not exist yet. Please run migration 031_customizable_officer_permissions_and_audit_workflow.sql in your Supabase SQL Editor.",
          needsMigration: true,
        }, { status: 400 });
      } else {
        const fallbackUpdates = { ...updates };
        delete fallbackUpdates.permissions;
        const retry = await db
          .from('profiles')
          .update(fallbackUpdates)
          .eq('id', userId)
          .select()
          .single();
        updated = retry.data;
        updateErr = retry.error;
      }
    }

    if (updateErr) {
      console.error('Error updating user:', updateErr);
      return NextResponse.json({ error: 'Failed to update user profile.' }, { status: 500 });
    }

    // Record governance audit log entries
    for (const audit of auditActions) {
      try {
        await supabase.from('audit_logs').insert([{
          user_id: auth.user.id,
          action: audit.action,
          entity_type: audit.entity_type,
          entity_id: audit.entity_id,
          details: audit.details,
        }]);
      } catch (auditErr) {
        console.warn('Admin action audit logging warning:', auditErr.message);
      }
    }

    // Dispatch email notifications to the affected user via Gmail SMTP
    if (existingUser?.email) {
      if (updates.role && updates.role !== existingUser.role) {
        sendAccountStatusChangedEmail({
          to: existingUser.email,
          name: existingUser.full_name || 'Officer',
          changeType: 'ROLE_CHANGED',
          details: {
            previousRole: existingUser.role,
            newRole: updates.role,
          },
        }).catch((err) => console.warn('Role change email notification warning:', err));
      }

      if (updates.status && updates.status !== existingUser.status) {
        sendAccountStatusChangedEmail({
          to: existingUser.email,
          name: existingUser.full_name || 'Officer',
          changeType: 'STATUS_CHANGED',
          details: {
            newStatus: updates.status,
          },
        }).catch((err) => console.warn('Status change email notification warning:', err));
      }
    }

    let message = 'User details successfully updated.';
    if (updates.permissions && !updates.role && !updates.status) {
      message = 'User permissions successfully updated.';
    } else if (updates.status && updates.role) {
      message = `User updated: role is now ${updates.role.toUpperCase()} and status is ${updates.status.toUpperCase()}.`;
    } else if (updates.status) {
      message = `User status successfully updated to ${updates.status === 'approved' ? 'ACTIVE' : 'SUSPENDED'}.`;
    } else if (updates.role) {
      message = `User role successfully updated to ${updates.role.toUpperCase()}.`;
    }

    return NextResponse.json({
      success: true,
      message,
      user: updated,
    });
  } catch (err) {
    console.error('Admin users PATCH error:', err);
    return NextResponse.json({ error: 'Server error updating user.' }, { status: 500 });
  }
}

// DELETE /api/admin/users — safely remove user account if 0 financial transactions recorded
export async function DELETE(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let userId = null;
    try {
      const body = await req.json();
      userId = body?.userId;
    } catch {
      const { searchParams } = new URL(req.url);
      userId = searchParams.get('userId');
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for account removal.' }, { status: 400 });
    }

    const supabase = auth.supabase;
    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    // Fetch target user profile
    const { data: targetUser, error: fetchErr } = await db
      .from('profiles')
      .select('id, auth_user_id, email, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !targetUser) {
      return NextResponse.json({ error: 'Target user account not found.' }, { status: 404 });
    }

    // 1. Super Admin Immutable Lock
    if (isSuperAdminEmail(targetUser.email) || targetUser.email === 'geronimoandreijohn.pdm@gmail.com') {
      return NextResponse.json({
        error: 'Primary Super Admin account is permanently locked and cannot be deactivated or deleted.',
      }, { status: 403 });
    }

    // 2. Financial Ledger Dependency Check
    const [
      { count: txCount },
      { count: countedCount },
      { count: verifiedCount },
      { count: commentCount },
      { count: debtCount },
      { count: advanceCount },
    ] = await Promise.all([
      db.from('transactions').select('id', { count: 'exact', head: true }).eq('logged_by', userId),
      db.from('cash_reconciliations').select('id', { count: 'exact', head: true }).eq('counted_by', userId),
      db.from('cash_reconciliations').select('id', { count: 'exact', head: true }).eq('verified_by', userId),
      db.from('transaction_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      db.from('debts_receivables').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      db.from('advances_payable').select('id', { count: 'exact', head: true }).eq('created_by', userId),
    ]);

    const totalLedgerOps =
      (txCount || 0) +
      (countedCount || 0) +
      (verifiedCount || 0) +
      (commentCount || 0) +
      (debtCount || 0) +
      (advanceCount || 0);

    if (totalLedgerOps > 0) {
      return NextResponse.json({
        error: `Cannot delete account with recorded ledger transactions, audit comments, debts, or advances (${totalLedgerOps} recorded). Suspend the account instead to preserve financial audit history.`,
        hasTransactions: true,
        transactionCount: totalLedgerOps,
        breakdown: {
          transactions: txCount || 0,
          cashReconciliations: (countedCount || 0) + (verifiedCount || 0),
          comments: commentCount || 0,
          debts: debtCount || 0,
          advances: advanceCount || 0,
        },
      }, { status: 409 });
    }

    // 3. Safe Account Removal (0 transactions)
    // Delete profile record
    const { error: deleteProfileErr } = await db
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileErr) {
      console.error('Error deleting profile:', deleteProfileErr);
      return NextResponse.json({ error: 'Failed to remove user profile from database.' }, { status: 500 });
    }

    // Delete from auth.users if auth_user_id exists
    if (targetUser.auth_user_id) {
      try {
        if (adminClient) {
          await adminClient.auth.admin.deleteUser(targetUser.auth_user_id);
        }
      } catch (authDeleteErr) {
        console.warn('Note: auth.users deletion notice:', authDeleteErr?.message);
      }
    }

    // Clean up corresponding registration_requests
    try {
      await db
        .from('registration_requests')
        .delete()
        .eq('email', targetUser.email);
    } catch (_) {}

    // Record deletion event in audit_logs
    try {
      await db.from('audit_logs').insert([{
        user_id: auth.user.id,
        action: 'ACCOUNT_DELETED',
        entity_type: 'profiles',
        entity_id: userId,
        details: {
          deleted_email: targetUser.email,
          deleted_name: targetUser.full_name,
          deleted_role: targetUser.role,
          deleted_by: auth.user.email,
        },
      }]);
    } catch (auditErr) {
      console.warn('Account deletion audit log error:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Account for ${targetUser.email} has been safely removed.`,
    });
  } catch (err) {
    console.error('Admin users DELETE error:', err);
    return NextResponse.json({ error: 'Server error removing account.' }, { status: 500 });
  }
}

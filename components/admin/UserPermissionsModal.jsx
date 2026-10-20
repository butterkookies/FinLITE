'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';
import {
  ACTION_DEFINITIONS,
  ROLE_DEFAULT_PERMISSIONS,
  resolveUserPermissions,
  ACTION_KEYS,
} from '@/lib/auth/permissions';
import { useTheme } from '@/components/theme/ThemeProvider';

const ROLE_OPTIONS = [
  { value: 'president', label: 'President', desc: 'Organizational Executive & Approval' },
  { value: 'treasurer', label: 'Treasurer', desc: 'Disbursements, Inflows & Cash Custody' },
  { value: 'auditor', label: 'Auditor', desc: 'Audit Review, Receipt Verification & Denominations' },
  { value: 'adviser', label: 'Adviser', desc: 'Faculty Oversight & Signatory' },
  { value: 'admin', label: 'Admin', desc: 'Full System & Access Control' },
  { value: 'member', label: 'Officer / Member', desc: 'Standard Access' },
];

export default function UserPermissionsModal({
  isOpen,
  onClose,
  user,
  onSaved,
}) {
  const { isLight } = useTheme();
  const [selectedRole, setSelectedRole] = useState('member');
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isPrimarySuperAdmin = user?.email === 'geronimoandreijohn.pdm@gmail.com';

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role || 'member');
      const resolved = resolveUserPermissions(user, user.email);
      setPermissions(resolved);
      setFeedback(null);
    }
  }, [user]);

  if (!user) return null;

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
  };

  const handleApplyDefaults = () => {
    const defaults = ROLE_DEFAULT_PERMISSIONS[selectedRole] || ROLE_DEFAULT_PERMISSIONS.member;
    setPermissions({ ...defaults });
    setFeedback({
      type: 'info',
      text: `Applied recommended default action permissions for ${selectedRole.toUpperCase()}. Click Save to persist.`,
    });
  };

  const handleToggleAction = (actionKey) => {
    if (isPrimarySuperAdmin) return;
    setPermissions((prev) => ({
      ...prev,
      [actionKey]: !prev[actionKey],
    }));
  };

  const handleSelectAll = (enable) => {
    if (isPrimarySuperAdmin) return;
    const updated = {};
    Object.values(ACTION_KEYS).forEach((k) => {
      updated[k] = enable;
    });
    setPermissions(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          role: selectedRole,
          permissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user permissions.');
      }

      setFeedback({
        type: 'success',
        text: data.message || 'Permissions and role successfully updated.',
      });

      if (onSaved) {
        onSaved({
          ...user,
          role: selectedRole,
          permissions,
        });
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Error updating permissions.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.values(ACTION_KEYS).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Customize Officer Actions &amp; Permissions
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure fine-grained capabilities independently of assigned position
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 pt-2">
        {/* User Identity Header Card */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              src={user.avatar_url}
              name={user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
              email={user.email}
              size="lg-12"
              rounded="xl"
              alt={user.full_name || 'Officer'}
              className="shrink-0 shadow-2xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold truncate">
                  {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                </span>
                {isPrimarySuperAdmin && (
                  <span
                    className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded flex items-center gap-1 ${
                      isLight
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-purple-500/20 text-purple-200'
                    }`}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>Super Admin</span>
                  </span>
                )}
              </div>
              <p className={`text-xs truncate ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Quick Active Actions Metric */}
          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                activeCount > 0
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : isLight
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-600'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {activeCount} of {totalCount} Actions Granted
              </span>
            </span>
          </div>
        </div>

        {/* Position & Default Presets Bar */}
        <div
          className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#18181b] border-zinc-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Official Position / Role
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select position title or apply recommended template
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                disabled={isPrimarySuperAdmin}
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`text-xs font-bold rounded-xl px-3 py-2 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                  isLight
                    ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                }`}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleApplyDefaults}
                disabled={isPrimarySuperAdmin}
                className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
                title="Populate recommended actions for this position"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply Recommended Defaults</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Checkboxes Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Permitted Actions
              </h4>
              <span className="text-[11px] text-zinc-500">
                (Click any checkbox to grant or revoke specific actions)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                disabled={isPrimarySuperAdmin}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Enable All
              </button>
              <span className="text-zinc-400">•</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                disabled={isPrimarySuperAdmin}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACTION_DEFINITIONS.map((action) => {
              const isEnabled = Boolean(permissions[action.key]);

              return (
                <div
                  key={action.key}
                  onClick={() => handleToggleAction(action.key)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isEnabled
                      ? isLight
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                        : 'bg-emerald-950/20 border-emerald-500/30 shadow-2xs'
                      : isLight
                      ? 'bg-white border-zinc-200 hover:border-zinc-300 opacity-75'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 opacity-75'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={isPrimarySuperAdmin}
                    onChange={() => {}} // Handled by container onClick
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500/30 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${isEnabled ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        {action.label}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isEnabled
                            ? isLight
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-emerald-500/20 text-emerald-300'
                            : isLight
                            ? 'bg-zinc-100 text-zinc-500'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      {action.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? isLight
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : feedback.type === 'error'
                ? isLight
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                : isLight
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isPrimarySuperAdmin}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Permissions...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save Permissions &amp; Role</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

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
import { Modal, Button, Badge, Select } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';
import {
  ACTION_DEFINITIONS,
  ROLE_DEFAULT_PERMISSIONS,
  resolveUserPermissions,
  ACTION_KEYS,
} from '@/lib/auth/permissions';
import { useTheme } from '@/components/theme/ThemeProvider';

const ROLE_OPTIONS = [
  { value: 'president', label: 'President', description: 'Executive oversight & operational approval' },
  { value: 'treasurer', label: 'Treasurer', description: 'Disbursements, inflows & cash custody' },
  { value: 'auditor', label: 'Auditor', description: 'Audit review, receipt verification & counts' },
  { value: 'adviser', label: 'Adviser', description: 'Faculty oversight & signatory' },
  { value: 'admin', label: 'Admin', description: 'Full system & access control' },
];

export default function UserPermissionsModal({
  isOpen,
  onClose,
  user,
  onSaved,
}) {
  const { isLight } = useTheme();
  const [selectedRole, setSelectedRole] = useState('treasurer');
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isPrimarySuperAdmin = user?.email === 'geronimoandreijohn.pdm@gmail.com';

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role || 'treasurer');
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
    const defaults = ROLE_DEFAULT_PERMISSIONS[selectedRole] || {};
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
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
      <div className="space-y-5 pt-1">
        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              src={user.avatar_url}
              name={user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
              email={user.email}
              size="lg-12"
              rounded="xl"
              alt={user.full_name || 'Officer'}
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold truncate text-zinc-950 dark:text-zinc-50">
                  {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                </span>
                {isPrimarySuperAdmin && (
                  <Badge variant="purple" size="xs">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Super Admin</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs truncate text-zinc-500 dark:text-zinc-400 mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          {/* Quick Active Actions Metric */}
          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <Badge variant={activeCount > 0 ? 'emerald' : 'neutral'} size="sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {activeCount} of {totalCount} Actions Granted
              </span>
            </Badge>
          </div>
        </div>

        {/* Position & Default Presets Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="space-y-0.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Official Position / Role
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select position title or apply recommended template
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="w-48 sm:w-56 shrink-0">
              <Select
                disabled={isPrimarySuperAdmin}
                value={selectedRole}
                onChange={handleRoleChange}
                options={ROLE_OPTIONS}
                size="sm"
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApplyDefaults}
              disabled={isPrimarySuperAdmin}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
              title="Populate recommended actions for this position"
            >
              <span>Apply Defaults</span>
            </Button>
          </div>
        </div>

        {/* Action Checkboxes Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Permitted Actions
              </h4>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                (Click any card to grant or revoke specific actions)
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {ACTION_DEFINITIONS.map((action) => {
              const isEnabled = Boolean(permissions[action.key]);

              return (
                <div
                  key={action.key}
                  onClick={() => handleToggleAction(action.key)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isEnabled
                      ? 'bg-emerald-500/10 text-zinc-950 dark:text-zinc-50 ring-1 ring-emerald-500/30'
                      : 'bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-850/60 text-zinc-800 dark:text-zinc-200 ring-1 ring-black/[0.04] dark:ring-white/[0.05]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={isPrimarySuperAdmin}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${isEnabled ? 'text-zinc-950 dark:text-zinc-100' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {action.label}
                      </span>
                      <Badge variant={isEnabled ? 'emerald' : 'neutral'} size="xs">
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
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
                ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-500/12 text-rose-800 dark:text-rose-300'
                : 'bg-blue-500/12 text-blue-800 dark:text-blue-300'
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
        <div className="flex items-center justify-between pt-2">
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

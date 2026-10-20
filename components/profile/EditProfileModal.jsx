'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Check, 
  CheckCircle2, 
  Lock, 
  Phone, 
  Upload, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { compressReceiptImage } from '@/lib/utils/compression';
import { validateContactNumber } from '@/lib/utils/validation';
import { createClient } from '@/lib/supabase/client';
import { Modal, Button, Badge, Input } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';

export default function EditProfileModal({ 
  isOpen, 
  onClose, 
  profile, 
  user, 
  onProfileUpdated 
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fileInputRef = useRef(null);
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);
  const contactInputRef = useRef(null);
  const [formErrors, setFormErrors] = useState({});
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setFormErrors({});
      setShakeKey(0);
      setSuccessMsg(null);
      setAvatarFile(null);

      // Split full name if first_name / last_name are not separately stored
      const pFirst = profile?.first_name || '';
      const pLast = profile?.last_name || '';
      if (pFirst || pLast) {
        setFirstName(pFirst);
        setLastName(pLast);
      } else if (profile?.full_name) {
        const parts = profile.full_name.trim().split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      } else {
        setFirstName(user?.user_metadata?.first_name || '');
        setLastName(user?.user_metadata?.last_name || '');
      }

      setContactNumber(profile?.contact_number || '');
      
      const currentAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
      setAvatarUrl(currentAvatar);
      setAvatarPreview(currentAvatar);
    }
  }, [isOpen, profile, user]);

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setError(null);

    try {
      const compressed = await compressReceiptImage(file);
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.warn('Compression fallback:', err);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setError(null);
    setSuccessMsg(null);

    // Validation
    const nextErrors = {};
    if (!firstName.trim()) {
      nextErrors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      nextErrors.lastName = 'Last name is required';
    }
    if (contactNumber && contactNumber.trim()) {
      const contactErr = validateContactNumber(contactNumber.trim());
      if (contactErr) {
        nextErrors.contactNumber = contactErr;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setShakeKey((prev) => prev + 1);
      if (nextErrors.firstName && firstNameInputRef.current) {
        firstNameInputRef.current.focus();
      } else if (nextErrors.lastName && lastNameInputRef.current) {
        lastNameInputRef.current.focus();
      } else if (nextErrors.contactNumber && contactInputRef.current) {
        contactInputRef.current.focus();
      }
      return;
    }

    setIsSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      // 1. If user selected a new avatar photo, upload to Supabase storage
      if (avatarFile) {
        const supabase = createClient();
        if (supabase) {
          try {
            const fileExt = avatarFile.name ? avatarFile.name.split('.').pop() : 'jpg';
            const filePath = `avatar-${user?.id || Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, avatarFile, {
                cacheControl: '3600',
                upsert: true,
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
              finalAvatarUrl = publicUrl;
            } else {
              console.warn('Avatars bucket upload note:', uploadError.message);
              // Fallback to receipts bucket if avatars has an issue
              const { error: fallbackError } = await supabase.storage
                .from('receipts')
                .upload(`avatars/${filePath}`, avatarFile, { cacheControl: '3600', upsert: true });

              if (!fallbackError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('receipts')
                  .getPublicUrl(`avatars/${filePath}`);
                finalAvatarUrl = publicUrl;
              }
            }
          } catch (storageErr) {
            console.error('Storage upload error:', storageErr);
          }
        }
      }

      // 2. Send update payload to /api/profile
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        contact_number: contactNumber.trim() || null,
        avatar_url: finalAvatarUrl || null,
      };

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile.');
        setIsSaving(false);
        return;
      }

      setSuccessMsg('Profile updated successfully!');
      if (onProfileUpdated && data.profile) {
        onProfileUpdated(data.profile);
      }

      setTimeout(() => {
        onClose();
      }, 700);

    } catch (err) {
      console.error('Submit profile update error:', err);
      setError('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const email = user?.email || profile?.email || '';
  const role = profile?.role || 'member';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile Information"
      description="Update your changeable personal and contact credentials"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
        
        {/* Avatar Photo Section */}
        <div className="flex items-center gap-4 p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="relative shrink-0">
            <UserAvatar
              src={avatarPreview}
              name={`${firstName} ${lastName}`.trim()}
              email={email}
              size="lg"
              rounded="2xl"
              alt="Avatar preview"
              className="border border-zinc-300 dark:border-zinc-700 shadow-xs"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing || isSaving}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title="Upload new photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Profile Picture</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">Upload a clear square portrait or photo</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing || isSaving}
                leftIcon={<Upload className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
              >
                {isCompressing ? 'Compressing...' : 'Upload Photo'}
              </Button>
              {(() => {
                const googlePhoto = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
                if (!avatarPreview || avatarPreview === googlePhoto) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(googlePhoto);
                      setAvatarUrl(googlePhoto);
                    }}
                    className="h-7 px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 text-[11px] font-medium cursor-pointer"
                  >
                    Reset to Google Photo
                  </button>
                );
              })()}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* First & Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className={formErrors.firstName ? 'animate-field-shake' : ''} key={`fn-${shakeKey}`}>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              First Name <span className="text-rose-500">*</span>
            </label>
            <Input
              ref={firstNameInputRef}
              type="text"
              placeholder="e.g. Andrei John"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (formErrors.firstName) setFormErrors((prev) => ({ ...prev, firstName: null }));
              }}
              aria-invalid={Boolean(formErrors.firstName)}
              className={formErrors.firstName ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
            />
            {formErrors.firstName && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{formErrors.firstName}</span>
              </p>
            )}
          </div>

          <div className={formErrors.lastName ? 'animate-field-shake' : ''} key={`ln-${shakeKey}`}>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <Input
              ref={lastNameInputRef}
              type="text"
              placeholder="e.g. Geronimo"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (formErrors.lastName) setFormErrors((prev) => ({ ...prev, lastName: null }));
              }}
              aria-invalid={Boolean(formErrors.lastName)}
              className={formErrors.lastName ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
            />
            {formErrors.lastName && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{formErrors.lastName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Contact Number */}
        <div className={formErrors.contactNumber ? 'animate-field-shake' : ''} key={`cn-${shakeKey}`}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
              Contact Number
            </label>
            <span className="text-[10px] text-zinc-400">
              {contactNumber.length}/11 digits
            </span>
          </div>
          <Input
            ref={contactInputRef}
            type="tel"
            inputMode="tel"
            maxLength={11}
            leftIcon={<Phone className="w-3.5 h-3.5" />}
            placeholder="09XXXXXXXXX (11 digits)"
            value={contactNumber}
            onChange={(e) => {
              setContactNumber(e.target.value.replace(/\D/g, ''));
              if (formErrors.contactNumber) setFormErrors((prev) => ({ ...prev, contactNumber: null }));
            }}
            aria-invalid={Boolean(formErrors.contactNumber)}
            className={formErrors.contactNumber ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
          />
          {formErrors.contactNumber && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{formErrors.contactNumber}</span>
            </p>
          )}
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
            Used for official transaction notifications and club officer emergency reachability.
          </p>
        </div>

        {/* Read-Only Fixed Information Notice */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-semibold text-[11px]">
            <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Institutional & Role Credentials (Read-Only)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-zinc-400 block">Registered Email</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block">{email}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">System Authority Role</span>
              <Badge variant="emerald" size="xs">
                {role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 pb-safe sm:pb-0 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSaving}
            disabled={isSaving || isCompressing}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            Save Changes
          </Button>
        </div>

      </form>
    </Modal>
  );
}

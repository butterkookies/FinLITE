'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Check, 
  CheckCircle2, 
  Lock, 
  Mail, 
  Phone, 
  Shield, 
  Upload, 
  User, 
  X, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { compressReceiptImage } from '@/lib/utils/compression';
import { validateContactNumber, validateUsername } from '@/lib/utils/validation';
import { createClient } from '@/lib/supabase/client';

export default function EditProfileModal({ 
  isOpen, 
  onClose, 
  profile, 
  user, 
  onProfileUpdated 
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
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

      setUsername(profile?.username || '');
      setContactNumber(profile?.contact_number || '');
      
      const currentAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
      setAvatarUrl(currentAvatar);
      setAvatarPreview(currentAvatar);
    }
  }, [isOpen, profile, user]);

  if (!isOpen) return null;

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
    setError(null);
    setSuccessMsg(null);

    // Validate Contact Number if entered
    if (contactNumber && contactNumber.trim()) {
      const contactErr = validateContactNumber(contactNumber.trim());
      if (contactErr) {
        setError(contactErr);
        return;
      }
    }

    // Validate Username if entered
    if (username && username.trim()) {
      const userErr = validateUsername(username.trim());
      if (userErr) {
        setError(userErr);
        return;
      }
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
        username: username.trim() || null,
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full border border-black/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-950">Edit Profile Information</h3>
            <p className="text-xs text-gray-500">Update your changeable personal and contact credentials</p>
          </div>
          <button 
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
          
          {/* Avatar Photo Section */}
          <div className="flex items-center gap-4 p-3.5 bg-gray-50/80 rounded-2xl border border-black/[0.06]">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-200 border border-black/[0.08] relative shadow-xs flex items-center justify-center">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-xl font-bold text-gray-700">
                    {firstName?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing || isSaving}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                title="Upload new photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-950">Profile Picture</p>
              <p className="text-[11px] text-gray-500 mb-2">Upload a clear square portrait or photo</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing || isSaving}
                  className="h-7 px-2.5 bg-white hover:bg-gray-100 active:bg-gray-200 border border-black/[0.08] text-gray-800 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>{isCompressing ? 'Compressing...' : 'Upload Photo'}</span>
                </button>
                {avatarPreview && avatarPreview !== (user?.user_metadata?.avatar_url || '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(user?.user_metadata?.avatar_url || '');
                      setAvatarUrl(user?.user_metadata?.avatar_url || '');
                    }}
                    className="h-7 px-2 text-rose-600 hover:text-rose-700 text-[11px] font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                )}
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
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Andrei John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Geronimo"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-gray-700 font-semibold">
                Username Handle
              </label>
              <span className="text-[10px] text-gray-400">Optional (letters, numbers, underscores)</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs pointer-events-none">
                @
              </span>
              <input
                type="text"
                placeholder="e.g. andreijohn"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full h-10 pl-7 pr-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Contact Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-gray-700 font-semibold">
                Contact Number
              </label>
              <span className="text-[10px] text-gray-400">
                {contactNumber.length}/11 digits
              </span>
            </div>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                maxLength={11}
                placeholder="09XXXXXXXXX (11 digits)"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full h-10 pl-9 pr-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 font-medium tabular-nums"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Used for official transaction notifications and club officer emergency reachability.
            </p>
          </div>

          {/* Read-Only Fixed Information Notice */}
          <div className="p-3 bg-gray-50 rounded-xl border border-black/[0.06] space-y-1.5">
            <div className="flex items-center gap-1.5 text-gray-600 font-semibold text-[11px]">
              <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Institutional & Role Credentials (Read-Only)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 pt-1 border-t border-black/[0.04]">
              <div>
                <span className="text-gray-400 block">Registered Email</span>
                <span className="font-medium text-gray-800 truncate block">{email}</span>
              </div>
              <div>
                <span className="text-gray-400 block">System Authority Role</span>
                <span className="font-semibold text-emerald-800 capitalize block">{role}</span>
              </div>
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[0.06]">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="h-10 px-4 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

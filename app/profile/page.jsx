'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  LogOut,
  Building,
  CheckCircle2,
  Shield,
  Pencil,
  Camera,
  Lock,
  KeyRound,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import EditProfileModal from '@/components/profile/EditProfileModal';
import UserAvatar from '@/components/common/UserAvatar';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      if (!supabase) {
        router.push('/login');
        return;
      }

      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error || !authUser) {
          router.push('/login');
          return;
        }

        setUser(authUser);
        const email = authUser.email?.toLowerCase();
        const isSuperAdmin = email === 'geronimoandreijohn.pdm@gmail.com';

        let { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        if (!profileData && email) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          profileData = profileByEmail;
        }

        if (profileData) {
          setProfile(profileData);
        } else if (isSuperAdmin) {
          setProfile({
            full_name: authUser.user_metadata?.full_name || 'Andrei John Geronimo',
            first_name: 'Andrei John',
            last_name: 'Geronimo',
            email: email,
            role: 'admin',
            status: 'approved',
            auth_provider: 'google',
            created_at: authUser.created_at,
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  const email = user?.email || profile?.email || '';
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'FinLITE Member';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const role = profile?.role || (email === 'geronimoandreijohn.pdm@gmail.com' ? 'admin' : 'member');
  const isAdmin = role === 'admin' || email === 'geronimoandreijohn.pdm@gmail.com';

  const roleLabelMap = {
    admin: 'Super Administrator',
    treasurer: 'LITE Treasurer',
    auditor: 'LITE Auditor',
    president: 'LITE President',
    adviser: 'LITE Club Adviser',
    member: 'General Officer / Member',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#09090b] transition-colors">

      {/* Top Header — Cohesive with Navbar & Admin Console */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3 min-w-0">

          {/* Left: Breadcrumbs & Back Nav */}
          <div className="flex items-center gap-2 sm:gap-3 pl-11 md:pl-0 min-w-0">
            <Link
              href="/"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shrink-0 shadow-2xs"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            <div className="flex items-center gap-1.5 min-w-0 text-xs sm:text-sm">
              <span className="text-zinc-400 dark:text-zinc-500 hidden xs:inline">FinLITE /</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">Account Profile</span>
            </div>
          </div>

          {/* Right: Auxiliary Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Link href="/admin">
                <Button
                  variant="amber-subtle"
                  size="sm"
                  leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
                  className="active:scale-95"
                >
                  <span className="hidden sm:inline">Admin Console</span>
                  <span className="sm:hidden">Admin</span>
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/40 active:scale-95"
              leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-500" />}
            >
              <span className="hidden xs:inline">Sign Out</span>
            </Button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 space-y-8 min-w-0">

        {/* 1. HERO IDENTITY — Clean, Unboxed & Direct */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-8 border-b border-zinc-200 dark:border-zinc-800 text-center sm:text-left">

          <div className="flex flex-col sm:flex-row items-center gap-5 min-w-0">
            {/* Avatar & Photo Trigger */}
            <div className="relative shrink-0 group">
              <UserAvatar
                src={avatarUrl}
                name={fullName}
                email={email}
                size="xl"
                rounded="2xl"
                alt={fullName}
                className="shadow-xs border border-zinc-200 dark:border-zinc-700"
              />

              {/* Change photo button */}
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* Verified Account Badge */}
              <div
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 border-2 border-white dark:border-[#09090b] flex items-center justify-center text-white shadow-xs"
                title="Verified Organization Member"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Identity Details */}
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                  {fullName}
                </h1>
                <Badge variant={isAdmin ? 'amber' : 'emerald'} size="xs" className="uppercase tracking-wider font-bold">
                  {roleLabelMap[role] || role}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium flex items-center justify-center sm:justify-start gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{email}</span>
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Account Active &amp; Verified</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 text-[11px]">
                  <KeyRound className="w-3 h-3 opacity-60" />
                  <span>Google Workspace OAuth</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              className="flex-1 sm:flex-initial shadow-xs active:scale-95"
            >
              <span>Edit Profile</span>
            </Button>

            <Link href="/profile/security" className="flex-1 sm:flex-initial">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                className="w-full shadow-2xs active:scale-95"
              >
                <span>Security</span>
              </Button>
            </Link>
          </div>

        </div>

        {/* 2. PROFILE DETAILS — Clean, Sectional & Unboxed */}
        <div className="space-y-8">

          {/* Section A: Contact & Access Credentials */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Contact &amp; Access Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Registered Email</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">{email}</span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Mobile Contact Number</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                    {profile?.contact_number || <span className="text-zinc-400 italic font-normal font-sans">Not provided</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Financial Role Authority</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize mt-0.5 block">
                  {roleLabelMap[role] || role} {isAdmin ? '• Full System Authority' : '• Segregated Duties'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Account Status</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Approved &amp; Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Institutional Affiliation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Institutional Affiliation
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Higher Education Institution</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                  Pambayang Dalubhasaan ng Marilao (PDM)
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">College Department</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                  College of Computer Studies (CCS)
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Recognized Student Organization</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                  League of Information Technology Enthusiasts (LITE)
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Degree Program</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                  Bachelor of Science in Information Technology (BSIT)
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">Campus Jurisdiction</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                  Marilao, Bulacan
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Edit Profile Modal */}
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          profile={profile}
          user={user}
          onProfileUpdated={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
        />

      </main>
    </div>
  );
}

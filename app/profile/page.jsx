'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  LogOut,
  Building,
  GraduationCap,
  CheckCircle2,
  ExternalLink,
  Shield,
  Pencil,
  Camera,
  Lock,
  User,
  KeyRound,
  FileText
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import EditProfileModal from '@/components/profile/EditProfileModal';

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
      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 w-full flex-1 space-y-5 sm:space-y-6 min-w-0">
        
        {/* 1. HERO IDENTITY CARD — Clean Adaptive SaaS Canvas */}
        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121214] p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all">
          
          {/* Subtle Ambient Accent Aura */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-5 sm:gap-6 text-center md:text-left">
            
            {/* Avatar & Photo Trigger */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 min-w-0">
              <div className="relative shrink-0 group">
                {avatarUrl ? (
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shadow-xs border-2 border-zinc-200 dark:border-zinc-700 relative bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      width={88}
                      height={88}
                      className="object-cover w-full h-full"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-xs">
                    {fullName[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                
                {/* Change photo button on hover */}
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
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 border-2 border-white dark:border-[#121214] flex items-center justify-center text-white shadow-xs" 
                  title="Verified Organization Member"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Identity & Metadata */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                    {fullName}
                  </h1>
                  {profile?.username && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono">
                      @{profile.username}
                    </span>
                  )}
                  <Badge variant={isAdmin ? 'amber' : 'emerald'} size="xs" className="uppercase tracking-wider font-bold">
                    {roleLabelMap[role] || role}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium flex items-center justify-center md:justify-start gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{email}</span>
                </p>

                <div className="flex items-center justify-center md:justify-start gap-2 pt-1 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Account Active &amp; Verified</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px]">
                    <KeyRound className="w-3 h-3 opacity-60" />
                    <span>Google Workspace OAuth</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Single Primary Action: Edit Profile */}
            <div className="shrink-0 w-full md:w-auto">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsEditOpen(true)}
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                className="w-full md:w-auto shadow-xs active:scale-95"
              >
                <span>Edit Profile</span>
              </Button>
            </div>

          </div>
        </div>

        {/* 2. BALANCED 2-COLUMN GRID: Academic Affiliation + Contact Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          
          {/* Card A: Institutional Affiliation */}
          <div className="rounded-2xl sm:rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121214] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Institutional Affiliation</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Campus Charter &amp; Academic Unit</p>
                </div>
              </div>

              <div className="space-y-3.5 pt-4 text-xs">
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Higher Education Institution</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    Pambayang Dalubhasaan ng Marilao (PDM)
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">College Department</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    College of Computer Studies (CCS)
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Recognized Student Organization</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    League of Information Technology Enthusiasts (LITE)
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Degree Program</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    Bachelor of Science in Information Technology (BSIT)
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Campus Jurisdiction</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Marilao, Bulacan</span>
            </div>
          </div>

          {/* Card B: Contact & Identity Credentials */}
          <div className="rounded-2xl sm:rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121214] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Contact &amp; Access</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Communication &amp; Financial Governance</p>
                </div>
              </div>

              <div className="space-y-3.5 pt-4 text-xs">
                {/* Username */}
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">System Username</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {profile?.username ? `@${profile.username}` : <span className="text-zinc-400 italic font-normal">Not configured</span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(true)}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {profile?.username ? 'Update' : '+ Add'}
                    </button>
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Mobile Contact Number</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                      {profile?.contact_number || <span className="text-zinc-400 italic font-normal font-sans">Not provided</span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(true)}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {profile?.contact_number ? 'Update' : '+ Add'}
                    </button>
                  </div>
                </div>

                {/* Role Authority */}
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Financial Role Authority</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize mt-0.5">
                    {roleLabelMap[role] || role} {isAdmin ? '• Full System Authority' : '• Segregated Duties'}
                  </p>
                </div>

                {/* Account Status */}
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Registration Status</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">Approved &amp; Active</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Access Control</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Supabase RLS Enforced</span>
            </div>
          </div>

        </div>

        {/* 3. SECURITY & SESSION TELEMETRY (Clean Replacement for Redundant Operations Card) */}
        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121214] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Security &amp; Session Telemetry</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Identity Protection &amp; Governance Safeguards</p>
              </div>
            </div>

            <Badge variant="emerald" size="xs">
              TLS 1.3 Encrypted
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Auth Method</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">OAuth 2.0 via Google</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Single Sign-On Verified</p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Database Guard</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">PostgreSQL RLS</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Strict multi-role policies</p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Audit Logging</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">Immutable Trail</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">All transactions timestamped</p>
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

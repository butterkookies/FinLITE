'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  User,
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
} from 'lucide-react';
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
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      
      {/* Top Header — Matching Global Obsidian Header */}
      <header className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 pl-12 md:pl-0">
            <Link
              href="/"
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-5 w-px bg-zinc-800" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-zinc-100">Account Profile</h1>
              <p className="text-[10px] text-zinc-400 font-medium">FinLITE Identity &amp; Security Credentials</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="h-8 px-2.5 text-xs font-medium text-zinc-200 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit Profile</span>
            </button>

            {isAdmin && (
              <Link
                href="/admin"
                className="h-8 px-2.5 text-xs font-medium text-amber-300 bg-amber-950/30 hover:bg-amber-950/60 border border-amber-900/40 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Admin Console</span>
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="h-9 px-3 text-xs font-semibold text-rose-300 bg-gradient-to-br from-[#280c13] to-[#19060b] hover:from-[#361019] hover:to-[#22080f] active:scale-98 border border-rose-500/30 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6">
        
        {/* Profile Card — Gradient matching Dashboard Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0a2e1d]/90 via-[#072417]/85 to-[#051b11]/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-all">
          {/* Ambient corner auras matching Dashboard Hero */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            
            {/* Avatar / Picture */}
            <div className="relative shrink-0 group">
              {avatarUrl ? (
                <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-md relative">
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0c3924] to-[#062014] flex items-center justify-center text-emerald-300 text-3xl font-black shadow-inner">
                  {fullName[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#0c3924] hover:bg-[#124d32] shadow-md flex items-center justify-center text-emerald-300 hover:text-white transition-colors cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#10b981] border-2 border-[#072417] flex items-center justify-center text-black font-black" title="Verified Account">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap mb-1">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                  {fullName}
                </h2>
                {profile?.username && (
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    @{profile.username}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0d3322] text-emerald-300">
                  {roleLabelMap[role] || role}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-white hover:bg-emerald-500/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  title="Edit Profile"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
              </div>

              <p className="text-sm text-white/70 font-medium flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{email}</span>
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Account Approved &amp; Active
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0d3020] text-emerald-100/75">
                  Provider: Google OAuth
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Detailed Information Grid — Gradient Matching Dashboard StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Institutional Affiliation */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0a2e1d]/90 via-[#072417]/85 to-[#051b11]/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-3.5 relative overflow-hidden transition-all">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2.5 text-emerald-400 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Building className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Institutional Affiliation</h3>
            </div>
            
            <div className="space-y-2.5 text-xs relative z-10">
              <div>
                <p className="text-emerald-100/50 font-medium">Institution</p>
                <p className="text-white font-bold mt-0.5">Pambayang Dalubhasaan ng Marilao (PDM)</p>
              </div>
              <div>
                <p className="text-emerald-100/50 font-medium">College</p>
                <p className="text-white font-bold mt-0.5">College of Computer Studies (CCS)</p>
              </div>
              <div>
                <p className="text-emerald-100/50 font-medium">Recognized Organization</p>
                <p className="text-white font-bold mt-0.5">League of Information Technology Enthusiasts (LITE)</p>
              </div>
            </div>
          </div>

          {/* Contact & Access */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0a2e1d]/90 via-[#072417]/85 to-[#051b11]/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-3.5 relative overflow-hidden transition-all">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2.5 text-emerald-400 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Contact &amp; Access</h3>
            </div>

            <div className="space-y-2.5 text-xs relative z-10">
              <div>
                <p className="text-emerald-100/50 font-medium">Username</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-white font-bold">
                    {profile?.username ? `@${profile.username}` : <span className="text-white/40 italic font-normal">Not set</span>}
                  </p>
                  <button
                    onClick={() => setIsEditOpen(true)}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    {profile?.username ? 'Change' : '+ Add'}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-emerald-100/50 font-medium">Contact Number</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-white font-bold tabular-nums">
                    {profile?.contact_number || <span className="text-white/40 italic font-normal">Not provided</span>}
                  </p>
                  <button
                    onClick={() => setIsEditOpen(true)}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    {profile?.contact_number ? 'Change' : '+ Add number'}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-emerald-100/50 font-medium">Financial Role Authority</p>
                <p className="text-white font-bold capitalize mt-0.5">
                  {role} {isAdmin ? '(Full System Authority)' : '(Restricted Segregation of Duties)'}
                </p>
              </div>
              <div>
                <p className="text-emerald-100/50 font-medium">Account Status</p>
                <p className="text-emerald-400 font-bold mt-0.5">Approved &amp; Verified</p>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Navigation Cards — Gradient Matching Dashboard */}
        <div className="rounded-3xl bg-gradient-to-br from-[#09291a]/90 via-[#072115]/85 to-[#05180f]/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300/80 mb-3 relative z-10">
            Available Operations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
            <Link
              href="/"
              className="p-4 rounded-2xl bg-gradient-to-br from-[#0b2f1e]/90 to-[#061d12]/90 hover:from-[#0e3b26] hover:to-[#092617] transition-all flex items-center justify-between group shadow-md"
            >
              <div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Main Ledger &amp; Dashboard</p>
                <p className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors mt-0.5">Record transactions, cash box, liquidation preview</p>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="p-4 rounded-2xl bg-gradient-to-br from-[#28200a]/90 to-[#181305]/90 hover:from-[#33290d] hover:to-[#201906] transition-all flex items-center justify-between group shadow-md"
              >
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Access Control &amp; Admin</p>
                  <p className="text-[11px] text-amber-200/50 group-hover:text-amber-200/70 transition-colors mt-0.5">Review and approve new member registration requests</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              </Link>
            )}
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

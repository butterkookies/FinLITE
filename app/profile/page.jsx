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
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

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
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  const email = user?.email || profile?.email || '';
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'FinLITE Member';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;
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
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/[0.06] shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-950">Account Profile</h1>
              <p className="text-[11px] text-gray-500 font-medium">FinLITE Identity & Security Credentials</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Admin Console</span>
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            
            {/* Avatar / Picture */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-sm relative">
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
                <div className="w-24 h-24 rounded-3xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-emerald-800 text-3xl font-black shadow-xs">
                  {fullName[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Verified Account">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap mb-1">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-950">
                  {fullName}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isAdmin 
                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {roleLabelMap[role] || role}
                </span>
              </div>

              <p className="text-sm text-gray-600 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{email}</span>
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Account Approved & Active
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-gray-100 text-gray-700">
                  Provider: Google OAuth
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Institutional Affiliation */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-800">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Building className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 className="text-sm font-bold text-gray-950">Institutional Affiliation</h3>
            </div>
            
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-gray-400 font-medium">Institution</p>
                <p className="text-gray-900 font-semibold">Pambayang Dalubhasaan ng Marilao (PDM)</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">College</p>
                <p className="text-gray-900 font-semibold">College of Computer Studies (CCS)</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Recognized Organization</p>
                <p className="text-gray-900 font-semibold">League of Information Technology Enthusiasts (LITE)</p>
              </div>
            </div>
          </div>

          {/* Contact & Verification */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-800">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 className="text-sm font-bold text-gray-950">Contact & Access</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <p className="text-gray-400 font-medium">Contact Number</p>
                <p className="text-gray-900 font-semibold">
                  {profile?.contact_number || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Financial Role Authority</p>
                <p className="text-gray-900 font-semibold capitalize">
                  {role} {isAdmin ? '(Full System Authority)' : '(Restricted Segregation of Duties)'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Account Status</p>
                <p className="text-emerald-700 font-bold">Approved & Verified</p>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Navigation Cards */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            Available Operations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/"
              className="p-3.5 rounded-xl border border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-950">Main Ledger & Dashboard</p>
                <p className="text-[11px] text-gray-500">Record transactions, cash box, liquidation preview</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 shrink-0" />
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="p-3.5 rounded-xl border border-amber-200/80 hover:border-amber-300 hover:bg-amber-50/40 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-gray-900 group-hover:text-amber-950">Access Control & Admin</p>
                  <p className="text-[11px] text-gray-500">Review and approve new member registration requests</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              </Link>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

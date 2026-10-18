import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/utils/validation';
import { verifyOtp } from '@/lib/security/otp';
import { sendPasswordChangedSecurityEmail } from '@/lib/email/mailer';

export async function POST(req) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email?.trim() || !code?.trim() || !newPassword) {
      return NextResponse.json({ error: 'Email, 6-digit reset code, and new password are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Password strength validation
    const passErr = validatePassword(newPassword);
    if (passErr) {
      return NextResponse.json({ error: passErr }, { status: 400 });
    }

    // 2. Verify 6-digit OTP code
    const verification = verifyOtp({
      email: cleanEmail,
      purpose: 'password_reset',
      code: code.trim(),
    });

    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    // 3. Update password in Supabase
    let updated = false;
    let updateError = null;

    const adminClient = createAdminClient();
    if (adminClient) {
      try {
        const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
        if (!listErr && usersData?.users) {
          const matchedUser = usersData.users.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (matchedUser) {
            const { error: adminUpdateErr } = await adminClient.auth.admin.updateUserById(matchedUser.id, {
              password: newPassword,
            });
            if (!adminUpdateErr) {
              updated = true;
            } else {
              updateError = adminUpdateErr.message;
            }
          }
        }
      } catch (adminEx) {
        console.warn('Admin password update note:', adminEx?.message);
      }
    }

    // Fallback: try RPC or session updateUser
    if (!updated) {
      const supabase = await createClient();
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('reset_user_password_with_otp', {
          p_email: cleanEmail,
          p_code: code.trim(),
          p_new_password: newPassword,
        });
        if (!rpcErr && rpcRes) {
          updated = true;
        }
      } catch (_) {}

      if (!updated) {
        try {
          const { error: sessionUpdateErr } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (!sessionUpdateErr) {
            updated = true;
          } else {
            updateError = sessionUpdateErr.message;
          }
        } catch (_) {}
      }
    }

    // If still couldn't update directly in auth.users, try sync_auth_user_credentials RPC
    if (!updated) {
      const supabase = await createClient();
      try {
        const { error: syncErr } = await supabase.rpc('sync_auth_user_credentials', {
          p_email: cleanEmail,
          p_password: newPassword,
        });
        if (!syncErr) {
          updated = true;
        }
      } catch (_) {}
    }

    if (!updated) {
      return NextResponse.json({
        error: updateError || 'Failed to update credentials. If you received a 1-click link in your email, please click that link to complete your reset.',
      }, { status: 400 });
    }

    // 4. Send Security Confirmation Email via Gmail SMTP
    sendPasswordChangedSecurityEmail({
      to: cleanEmail,
      name: verification.name || 'Officer',
    }).catch((emailErr) => console.warn('Password change security email warning:', emailErr));

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully updated. You can now sign in with your new password.',
    });

  } catch (err) {
    console.error('Reset password API error:', err);
    return NextResponse.json({ error: 'Server error updating password. Please try again.' }, { status: 500 });
  }
}

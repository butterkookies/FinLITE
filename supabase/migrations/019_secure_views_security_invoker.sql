-- ==============================================================================
-- Migration 019: Secure Views with Security Invoker & Enforce RLS
-- ==============================================================================
-- Context: In PostgreSQL/Supabase, views default to 'security definer' (running as 
-- the owner 'postgres'), which bypasses Row Level Security on underlying tables.
-- Setting security_invoker = true ensures that queries against this view strictly
-- respect the RLS policies defined on 'transactions', 'profiles', etc.

ALTER VIEW public.v_transactions_normalized SET (security_invoker = true);

-- Revoke anonymous access so unauthenticated callers cannot query financial views
REVOKE ALL ON public.v_transactions_normalized FROM anon;
GRANT SELECT ON public.v_transactions_normalized TO authenticated;

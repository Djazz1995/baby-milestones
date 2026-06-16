import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Zero-friction identity (AGENTS.md §8.2, PLAN.md): silently sign the device
 * in anonymously on first launch so every install has a `user id` with no
 * login wall. The session persists via the SecureStore adapter; later an
 * optional email/OAuth upgrade can link it (needed for buddy / cross-device).
 *
 * Idempotent: returns the existing session if already signed in.
 */
export async function ensureSession(): Promise<Session> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;

  const { data: signedIn, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;
  if (!signedIn.session) throw new Error('Anonymous sign-in returned no session.');
  return signedIn.session;
}

/** Current user id, or null if not yet signed in. */
export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}


"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Session {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string | null;
  expires: string;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();

  const fetchSession = useCallback(() => {
    setStatus('loading');
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setSession(data.session);
          setStatus('authenticated');
        } else {
          setSession(null);
          setStatus('unauthenticated');
        }
      }).catch(() => {
        setSession(null);
        setStatus('unauthenticated');
      });
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // When the window is focused, re-fetch the session
  useEffect(() => {
    const onFocus = () => fetchSession();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchSession]);

  return { session, status };
}

export async function signIn() {
  const res = await fetch('/api/auth/url');
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  }
}

export async function signOut() {
  await fetch('/api/auth/signout');
  window.location.reload();
}

    
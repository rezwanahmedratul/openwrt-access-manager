import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Prioritize IPv4 DNS lookups in Node.js to avoid IPv6 timeouts
if (typeof process !== 'undefined') {
  try {
    const dns = require('dns');
    if (dns && typeof dns.setDefaultResultOrder === 'function') {
      dns.setDefaultResultOrder('ipv4first');
    }
  } catch {
    // Ignore in edge / browser environments
  }
}

// Ensure global WebSocket is available for @supabase/realtime-js in Node < 22
if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {} as any;
}

const dummyUrl = 'https://placeholder.supabase.co';
const dummyKey = 'placeholder-key';

let cachedPublicSupabase: SupabaseClient | null = null;
let cachedServiceSupabase: SupabaseClient | null = null;

export function getPublicSupabase(): SupabaseClient {
  if (cachedPublicSupabase) {
    return cachedPublicSupabase;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || dummyUrl;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    dummyKey;

  cachedPublicSupabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          cache: 'no-store',
        });
      },
    },
  });

  return cachedPublicSupabase;
}

export function getServiceSupabase(): SupabaseClient {
  if (cachedServiceSupabase) {
    return cachedServiceSupabase;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || dummyUrl;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    dummyKey;

  cachedServiceSupabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          cache: 'no-store',
        });
      },
    },
  });

  return cachedServiceSupabase;
}

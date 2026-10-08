import { supabase } from './supabaseClient';
import { Profile, Store, AuthSession } from '@/types';

export async function signIn(
  email: string,
  password: string
): Promise<{ session: AuthSession; profile: Profile; store: Store | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session || !data.user) throw new Error('Kirish amalga oshmadi');

  const session: AuthSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id: data.user.id,
    email: data.user.email ?? email,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };

  const profile = await fetchProfile(data.user.id);
  let store: Store | null = null;
  if (profile.store_id) {
    store = await fetchStore(profile.store_id);
  }

  return { session, profile, store };
}

export async function refreshSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id: data.user!.id,
    email: data.user!.email ?? '',
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, store_id, role, is_active, assignment_version')
    .eq('id', userId)
    .single();
  if (error) throw new Error('Profil yuklanmadi: ' + error.message);
  return data as Profile;
}

export async function fetchStore(storeId: string): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, is_active')
    .eq('id', storeId)
    .single();
  if (error) throw new Error('Magazin yuklanmadi: ' + error.message);
  return data as Store;
}

export async function getLocalSession(): Promise<{ session: AuthSession; profile: Profile; store: Store | null } | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  try {
    const profile = await fetchProfile(data.session.user.id);
    let store: Store | null = null;
    if (profile.store_id) {
      store = await fetchStore(profile.store_id);
    }
    const session: AuthSession = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user_id: data.session.user.id,
      email: data.session.user.email ?? '',
      expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    };
    return { session, profile, store };
  } catch {
    return null;
  }
}

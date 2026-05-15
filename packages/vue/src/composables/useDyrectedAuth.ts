import { ref, computed, type Ref } from 'vue';
import { createClient, type DyrectedClient } from '@dyrected/sdk';

export interface DyrectedAuthUser {
  id: string;
  email: string;
  [key: string]: any;
}

export interface UseDyrectedAuthOptions {
  baseUrl: string;
  apiKey: string;
  siteId?: string;
  /**
   * Optional token storage. Defaults to localStorage.
   */
  storage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
}

/**
 * useDyrectedAuth — Generic Vue composable for auth collections.
 */
export function useDyrectedAuth(collection: string, options: UseDyrectedAuthOptions) {
  const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);
  const tokenKey = `dyrected_token_${collection}`;
  
  const token = ref<string | null>(storage?.getItem(tokenKey) || null);
  const user = ref<DyrectedAuthUser | null>(null) as Ref<DyrectedAuthUser | null>;
  
  const isLoggedIn = computed(() => !!token.value);

  const client = createClient({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    siteId: options.siteId,
  });

  if (token.value) {
    client.setToken(token.value);
  }

  async function login(email: string, password: string): Promise<DyrectedAuthUser> {
    const { token: newToken, user: userData } = await client.collection(collection).login(email, password);
    token.value = newToken;
    user.value = userData as DyrectedAuthUser;
    
    if (storage) {
      storage.setItem(tokenKey, newToken);
    }
    
    client.setToken(newToken);
    return userData as DyrectedAuthUser;
  }

  async function logout(): Promise<void> {
    if (token.value) {
      try {
        await client.collection(collection).logout();
      } catch (err) {
        // Best effort
      }
    }
    
    token.value = null;
    user.value = null;
    
    if (storage) {
      storage.removeItem(tokenKey);
    }
  }

  async function fetchMe(): Promise<DyrectedAuthUser | null> {
    if (!token.value) return null;
    try {
      const me = await client.collection(collection).me();
      user.value = me as DyrectedAuthUser;
      return me as DyrectedAuthUser;
    } catch (err) {
      token.value = null;
      user.value = null;
      if (storage) {
        storage.removeItem(tokenKey);
      }
      return null;
    }
  }

  return {
    user,
    isLoggedIn,
    token,
    login,
    logout,
    fetchMe,
    client
  };
}

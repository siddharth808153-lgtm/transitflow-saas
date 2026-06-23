// src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: any; // User object or null
  token: string | null;
  isAuthenticated: boolean;
  login: (user: any, token: string) => void;
  logout: () => void;
  setUser: (user: any) => void;
}

const getInitialToken = () => localStorage.getItem('transport_token');
const getInitialUser = () => {
  const storedUser = localStorage.getItem('transport_user');
  try {
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!getInitialToken(),
  login: (user, token) => {
    localStorage.setItem('transport_token', token);
    localStorage.setItem('transport_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('transport_token');
    localStorage.removeItem('transport_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  setUser: (user) => {
    localStorage.setItem('transport_user', JSON.stringify(user));
    set({ user });
  },
}));

// Compatibility wrappers for existing template components
export const useSessionUser = (selector: (state: any) => any) => {
  const store = useAuthStore();
  const userName = store.user?.name || store.user?.userName || '';
  const email = store.user?.email || '';
  const authority = store.user?.role ? [store.user.role] : [];
  const avatar = store.user?.avatar || '';

  const compatibilityState = {
    session: {
      signedIn: store.isAuthenticated,
    },
    user: {
      userName,
      email,
      authority,
      avatar,
    },
    setSessionSignedIn: (payload: boolean) => {
      // noop
    },
    setUser: (payload: any) => {
      store.setUser({ ...store.user, ...payload });
    },
  };

  return selector(compatibilityState);
};

export const useToken = () => {
  const store = useAuthStore();
  return {
    token: store.token,
    setToken: (token: string) => {
      if (token) {
        store.login(store.user || {}, token);
      } else {
        store.logout();
      }
    },
  };
};

export default useAuthStore;

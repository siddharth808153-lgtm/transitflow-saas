// src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: any; // User object or null
  token: string | null;
  isAuthenticated: boolean;
  backupToken: string | null;
  backupUser: any | null;
  login: (user: any, token: string) => void;
  logout: () => void;
  setUser: (user: any) => void;
  impersonate: (user: any, token: string) => void;
  stopImpersonating: () => void;
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

const getInitialBackupToken = () => localStorage.getItem('transport_backup_token');
const getInitialBackupUser = () => {
  const storedBackupUser = localStorage.getItem('transport_backup_user');
  try {
    return storedBackupUser ? JSON.parse(storedBackupUser) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!getInitialToken(),
  backupToken: getInitialBackupToken(),
  backupUser: getInitialBackupUser(),
  login: (user, token) => {
    localStorage.setItem('transport_token', token);
    localStorage.setItem('transport_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('transport_token');
    localStorage.removeItem('transport_user');
    localStorage.removeItem('transport_backup_token');
    localStorage.removeItem('transport_backup_user');
    set({ user: null, token: null, isAuthenticated: false, backupToken: null, backupUser: null });
  },
  setUser: (user) => {
    localStorage.setItem('transport_user', JSON.stringify(user));
    set({ user });
  },
  impersonate: (targetUser, targetToken) => {
    const currentToken = localStorage.getItem('transport_token');
    const currentUser = localStorage.getItem('transport_user');

    if (currentToken && currentUser) {
      localStorage.setItem('transport_backup_token', currentToken);
      localStorage.setItem('transport_backup_user', currentUser);
    }

    localStorage.setItem('transport_token', targetToken);
    localStorage.setItem('transport_user', JSON.stringify(targetUser));

    set({
      user: targetUser,
      token: targetToken,
      isAuthenticated: true,
      backupToken: currentToken,
      backupUser: currentUser ? JSON.parse(currentUser) : null,
    });
  },
  stopImpersonating: () => {
    const backupToken = localStorage.getItem('transport_backup_token');
    const backupUserStr = localStorage.getItem('transport_backup_user');

    if (backupToken && backupUserStr) {
      localStorage.setItem('transport_token', backupToken);
      localStorage.setItem('transport_user', backupUserStr);
      localStorage.removeItem('transport_backup_token');
      localStorage.removeItem('transport_backup_user');

      set({
        user: JSON.parse(backupUserStr),
        token: backupToken,
        isAuthenticated: true,
        backupToken: null,
        backupUser: null,
      });
    }
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

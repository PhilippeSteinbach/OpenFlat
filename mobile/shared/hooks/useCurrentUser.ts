import { create } from 'zustand';

export interface UserInfo {
  id: number;
  name: string;
  role: string;
}

interface CurrentUserState {
  currentUser: UserInfo | null;
  setCurrentUser: (user: UserInfo) => void;
  clearCurrentUser: () => void;
}

export const useCurrentUserStore = create<CurrentUserState>()((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  clearCurrentUser: () => set({ currentUser: null }),
}));

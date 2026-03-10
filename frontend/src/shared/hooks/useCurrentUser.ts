import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const useCurrentUserStore = create<CurrentUserState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      clearCurrentUser: () => set({ currentUser: null }),
    }),
    {
      name: "openflat-current-user",
    },
  ),
);

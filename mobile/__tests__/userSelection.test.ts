import { useCurrentUserStore, UserInfo } from '../shared/hooks/useCurrentUser';

const PREDEFINED_USERS: UserInfo[] = [
  { id: 1, name: 'Alex', role: 'Coordinator' },
  { id: 2, name: 'Jordan', role: 'Coordinator' },
  { id: 3, name: 'Sam', role: 'Resident' },
  { id: 4, name: 'Taylor', role: 'Resident' },
  { id: 5, name: 'Casey', role: 'Resident' },
];

describe('User Selection & Dashboard Logic', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser: null });
  });

  describe('User Selection', () => {
    it('should have 5 predefined users available', () => {
      expect(PREDEFINED_USERS).toHaveLength(5);
    });

    it('should have coordinators and residents', () => {
      const coordinators = PREDEFINED_USERS.filter((u) => u.role === 'Coordinator');
      const residents = PREDEFINED_USERS.filter((u) => u.role === 'Resident');
      expect(coordinators).toHaveLength(2);
      expect(residents).toHaveLength(3);
    });

    it('should select a user and persist in store', () => {
      const user = PREDEFINED_USERS[0];
      useCurrentUserStore.getState().setCurrentUser(user);

      const state = useCurrentUserStore.getState();
      expect(state.currentUser).toEqual(user);
      expect(state.currentUser?.id).toBe(1);
      expect(state.currentUser?.name).toBe('Alex');
    });

    it('should select different users', () => {
      PREDEFINED_USERS.forEach((user) => {
        useCurrentUserStore.getState().setCurrentUser(user);
        expect(useCurrentUserStore.getState().currentUser).toEqual(user);
      });
    });
  });

  describe('Dashboard', () => {
    it('should show user greeting after selection', () => {
      const user = PREDEFINED_USERS[0];
      useCurrentUserStore.getState().setCurrentUser(user);
      const greeting = `Hey, ${useCurrentUserStore.getState().currentUser?.name}!`;
      expect(greeting).toBe('Hey, Alex!');
    });

    it('should provide 3 module navigation targets', () => {
      const modules = [
        { key: 'cleaning', route: '/(tabs)/cleaning' },
        { key: 'shopping', route: '/(tabs)/shopping' },
        { key: 'finance', route: '/(tabs)/finance' },
      ];
      expect(modules).toHaveLength(3);
      expect(modules.map((m) => m.key)).toEqual(['cleaning', 'shopping', 'finance']);
    });

    it('should allow switching users (clear and re-select)', () => {
      // Select Alex
      useCurrentUserStore.getState().setCurrentUser(PREDEFINED_USERS[0]);
      expect(useCurrentUserStore.getState().currentUser?.name).toBe('Alex');

      // Switch user
      useCurrentUserStore.getState().clearCurrentUser();
      expect(useCurrentUserStore.getState().currentUser).toBeNull();

      // Select Jordan
      useCurrentUserStore.getState().setCurrentUser(PREDEFINED_USERS[1]);
      expect(useCurrentUserStore.getState().currentUser?.name).toBe('Jordan');
    });
  });
});

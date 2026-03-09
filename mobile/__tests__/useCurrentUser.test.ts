import { useCurrentUserStore } from '../shared/hooks/useCurrentUser';

describe('useCurrentUserStore', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser: null });
  });

  it('should start with no current user', () => {
    const { currentUser } = useCurrentUserStore.getState();
    expect(currentUser).toBeNull();
  });

  it('should set current user', () => {
    const user = { id: 1, name: 'Alex', role: 'Coordinator' };
    useCurrentUserStore.getState().setCurrentUser(user);
    expect(useCurrentUserStore.getState().currentUser).toEqual(user);
  });

  it('should clear current user', () => {
    const user = { id: 1, name: 'Alex', role: 'Coordinator' };
    useCurrentUserStore.getState().setCurrentUser(user);
    useCurrentUserStore.getState().clearCurrentUser();
    expect(useCurrentUserStore.getState().currentUser).toBeNull();
  });
});

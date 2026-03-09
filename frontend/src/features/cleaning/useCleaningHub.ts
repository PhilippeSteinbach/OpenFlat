import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSignalR } from '@/shared/hooks/useSignalR';

/**
 * Connects to the Cleaning SignalR hub and invalidates relevant React Query
 * caches when the server broadcasts task or leaderboard changes.
 */
export function useCleaningHub() {
  const queryClient = useQueryClient();
  const { isConnected, on } = useSignalR({
    hubUrl: '/hubs/cleaning',
    enabled: true,
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Task mutations
    const taskEvents = [
      'TaskCreated',
      'TaskUpdated',
      'TaskDeleted',
      'TaskCompleted',
      'TaskUncompleted',
      'TaskAssigned',
    ];

    for (const event of taskEvents) {
      const unsub = on(event, () => {
        queryClient.invalidateQueries({ queryKey: ['cleaning', 'tasks'] });
      });
      if (unsub) unsubs.push(unsub);
    }

    // Comment mutations
    const commentEvents = ['CommentAdded', 'CommentUpdated', 'CommentDeleted'];
    for (const event of commentEvents) {
      const unsub = on(event, () => {
        queryClient.invalidateQueries({ queryKey: ['cleaning'] });
      });
      if (unsub) unsubs.push(unsub);
    }

    // Leaderboard
    const leaderboardUnsub = on('LeaderboardUpdated', () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', 'leaderboard'] });
    });
    if (leaderboardUnsub) unsubs.push(leaderboardUnsub);

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [on, queryClient]);

  return { isConnected };
}

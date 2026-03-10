import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignalR } from "@/shared/hooks/useSignalR";

/**
 * Connects to the Shopping SignalR hub and invalidates relevant React Query
 * caches when the server broadcasts item or comment changes.
 */
export function useShoppingHub() {
  const queryClient = useQueryClient();
  const { isConnected, on } = useSignalR({
    hubUrl: "/hubs/shopping",
    enabled: true,
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Item mutations
    const itemEvents = [
      "ItemCreated",
      "ItemUpdated",
      "ItemBought",
      "ItemUndone",
      "ItemDeleted",
      "ItemAutoCleared",
    ];

    for (const event of itemEvents) {
      const unsub = on(event, () => {
        queryClient.invalidateQueries({ queryKey: ["shopping", "items"] });
      });
      if (unsub) unsubs.push(unsub);
    }

    // Comment mutations
    const commentEvents = ["CommentAdded", "CommentUpdated", "CommentDeleted"];
    for (const event of commentEvents) {
      const unsub = on(event, () => {
        queryClient.invalidateQueries({ queryKey: ["shopping"] });
      });
      if (unsub) unsubs.push(unsub);
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [on, queryClient]);

  return { isConnected };
}

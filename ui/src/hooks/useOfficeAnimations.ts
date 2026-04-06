/**
 * useOfficeAnimations
 *
 * React hook that bridges the existing LiveUpdatesProvider WebSocket events
 * into the office canvas animation system. It listens for live events and
 * translates them into visual animations via OfficeEventBridge.
 *
 * Usage: Call once in the VirtualOffice page component.
 */

import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import {
  officeAnimationQueue,
  mapLiveEventToAnimations,
  type OfficeAnimation,
  type AnimationQueue,
} from "@/engine/OfficeEventBridge";

// ---------------------------------------------------------------------------
// Hook: subscribe to the global animation queue
// ---------------------------------------------------------------------------

/**
 * Returns the current list of active animations, re-rendering when new
 * animations are pushed or expired ones are drained.
 */
export function useOfficeAnimations(): {
  animations: readonly OfficeAnimation[];
  queue: AnimationQueue;
  forAgent: (agentId: string) => OfficeAnimation[];
  clearForAgent: (agentId: string) => void;
} {
  // Force re-renders on queue changes
  const versionRef = useRef(0);
  const subscribersRef = useRef(new Set<() => void>());

  useEffect(() => {
    const unsub = officeAnimationQueue.subscribe(() => {
      versionRef.current++;
      for (const fn of subscribersRef.current) fn();
    });
    return unsub;
  }, []);

  // Tick the queue periodically to drain expired animations
  useEffect(() => {
    const interval = setInterval(() => {
      const expired = officeAnimationQueue.tick(Date.now());
      if (expired.length > 0) {
        versionRef.current++;
        for (const fn of subscribersRef.current) fn();
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const subscribe = useCallback((onStoreChange: () => void) => {
    subscribersRef.current.add(onStoreChange);
    return () => {
      subscribersRef.current.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    return versionRef.current;
  }, []);

  // This triggers re-renders when version changes
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const forAgent = useCallback(
    (agentId: string) => officeAnimationQueue.forAgent(agentId),
    [],
  );

  const clearForAgent = useCallback(
    (agentId: string) => officeAnimationQueue.clearForAgent(agentId),
    [],
  );

  return {
    animations: officeAnimationQueue.active(),
    queue: officeAnimationQueue,
    forAgent,
    clearForAgent,
  };
}

// ---------------------------------------------------------------------------
// Hook: pipe WebSocket events into the animation queue
// ---------------------------------------------------------------------------

/**
 * Listens on the WebSocket (via a MutationObserver on the existing
 * LiveUpdatesProvider toast mechanism) and feeds events into the
 * office animation queue.
 *
 * This is a lightweight bridge — the actual WebSocket connection is still
 * managed by LiveUpdatesProvider. We hook into its query-invalidation
 * side-effects to detect events.
 *
 * For a tighter integration, we could modify LiveUpdatesProvider to also
 * call officeAnimationQueue.push(), but this approach avoids touching the
 * upstream code.
 */
export function useOfficeEventPipe(companyId: string): void {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!companyId) return;

    // Connect a parallel lightweight WebSocket to the same live-events endpoint
    // This mirrors what LiveUpdatesProvider does but feeds into the animation queue
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/api/companies/${companyId}/events/ws`;

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      if (closed) return;
      try {
        ws = new WebSocket(url);
        wsRef.current = ws;
      } catch {
        // Will retry
        reconnectTimeout = setTimeout(connect, 5000);
        return;
      }

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const animations = mapLiveEventToAnimations({
            type: data.type ?? "",
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            details: data.details ?? data.payload,
          });
          if (animations.length > 0) {
            officeAnimationQueue.push(...animations);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [companyId]);
}

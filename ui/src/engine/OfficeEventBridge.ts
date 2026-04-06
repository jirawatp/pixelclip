/**
 * OfficeEventBridge
 *
 * Maps WebSocket LiveEvent data (from LiveUpdatesProvider) to visual
 * animations in the pixel-art office canvas.  The bridge is consumed by
 * OfficeCanvas — it maintains a queue of pending animations that the
 * render loop drains each frame.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OfficeAnimationType =
  | "agent-start-working"    // agent sits & begins typing
  | "agent-stop-working"     // agent stops typing, goes idle
  | "agent-thinking"         // thought bubble appears
  | "agent-error"            // red exclamation above head
  | "agent-paused"           // agent falls asleep (ZZZ)
  | "agent-resumed"          // agent wakes up
  | "agent-celebrating"      // brief celebrate animation
  | "task-assigned"          // document flies to agent desk
  | "task-completed"         // green checkmark on desk
  | "budget-warning"         // office lights flicker yellow
  | "budget-exceeded"        // agent falls asleep, money icon
  | "heartbeat-pulse"        // subtle glow on agent
  | "approval-needed"        // meeting room bell rings
  | "agent-hired"            // character walks in through door
  | "agent-removed"          // character walks out
  | "speech-bubble"          // speech bubble with text
  | "thought-bubble"         // thought bubble with text
  | "comment-added";         // small chat icon on desk

export interface OfficeAnimation {
  id: string;
  type: OfficeAnimationType;
  agentId?: string;
  text?: string;            // for speech/thought bubbles
  issueId?: string;
  timestamp: number;
  duration: number;         // ms — how long the animation plays
  priority: number;         // higher = shown first if queue is full
}

// ---------------------------------------------------------------------------
// Event → Animation mapping
// ---------------------------------------------------------------------------

let nextAnimId = 0;
function makeId(): string {
  return `anim_${++nextAnimId}_${Date.now()}`;
}

/**
 * Translates a raw LiveEvent (from the WebSocket) into zero or more
 * OfficeAnimation items.
 */
export function mapLiveEventToAnimations(event: {
  type: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  details?: Record<string, unknown>;
}): OfficeAnimation[] {
  const animations: OfficeAnimation[] = [];
  const now = Date.now();

  const agentId =
    (event.details?.agentId as string) ??
    (event.entityType === "agent" ? event.entityId : undefined);

  const issueId =
    (event.details?.issueId as string) ??
    (event.entityType === "issue" ? event.entityId : undefined);

  // --- Run / heartbeat events -------------------------------------------

  if (event.entityType === "run" || event.type === "run") {
    const status = (event.details?.status as string) ?? event.action;

    if (status === "running" || status === "started") {
      animations.push({
        id: makeId(),
        type: "agent-start-working",
        agentId,
        issueId,
        timestamp: now,
        duration: 0, // persistent until stop
        priority: 5,
      });

      // Add speech bubble with task title
      const title =
        (event.details?.issueTitle as string) ??
        (event.details?.title as string);
      if (title && agentId) {
        animations.push({
          id: makeId(),
          type: "speech-bubble",
          agentId,
          text: `Working on: ${title.slice(0, 60)}`,
          timestamp: now,
          duration: 8000,
          priority: 3,
        });
      }
    }

    if (status === "completed" || status === "succeeded") {
      animations.push(
        {
          id: makeId(),
          type: "agent-stop-working",
          agentId,
          timestamp: now,
          duration: 0,
          priority: 5,
        },
        {
          id: makeId(),
          type: "agent-celebrating",
          agentId,
          timestamp: now,
          duration: 2000,
          priority: 4,
        },
        {
          id: makeId(),
          type: "task-completed",
          agentId,
          issueId,
          timestamp: now,
          duration: 3000,
          priority: 3,
        },
      );
    }

    if (status === "failed" || status === "error") {
      animations.push(
        {
          id: makeId(),
          type: "agent-stop-working",
          agentId,
          timestamp: now,
          duration: 0,
          priority: 5,
        },
        {
          id: makeId(),
          type: "agent-error",
          agentId,
          text: (event.details?.error as string) ?? "Something went wrong",
          timestamp: now,
          duration: 5000,
          priority: 6,
        },
      );
    }

    if (status === "cancelled" || status === "timed_out") {
      animations.push({
        id: makeId(),
        type: "agent-stop-working",
        agentId,
        timestamp: now,
        duration: 0,
        priority: 5,
      });
    }
  }

  // --- Issue events ------------------------------------------------------

  if (event.entityType === "issue") {
    if (event.action === "created" || event.action === "assigned") {
      const assigneeId = (event.details?.assigneeAgentId as string) ?? agentId;
      if (assigneeId) {
        animations.push({
          id: makeId(),
          type: "task-assigned",
          agentId: assigneeId,
          issueId,
          timestamp: now,
          duration: 2000,
          priority: 3,
        });
      }
    }

    if (event.action === "comment_added") {
      animations.push({
        id: makeId(),
        type: "comment-added",
        agentId,
        issueId,
        timestamp: now,
        duration: 3000,
        priority: 2,
      });
    }

    if (event.action === "status_changed") {
      const newStatus = event.details?.status as string;
      if (newStatus === "done" || newStatus === "closed") {
        animations.push({
          id: makeId(),
          type: "task-completed",
          agentId,
          issueId,
          timestamp: now,
          duration: 3000,
          priority: 3,
        });
      }
    }
  }

  // --- Agent events ------------------------------------------------------

  if (event.entityType === "agent") {
    if (event.action === "created") {
      animations.push({
        id: makeId(),
        type: "agent-hired",
        agentId: event.entityId,
        timestamp: now,
        duration: 3000,
        priority: 7,
      });
    }

    if (event.action === "terminated" || event.action === "deleted") {
      animations.push({
        id: makeId(),
        type: "agent-removed",
        agentId: event.entityId,
        timestamp: now,
        duration: 3000,
        priority: 7,
      });
    }

    if (event.action === "paused") {
      animations.push({
        id: makeId(),
        type: "agent-paused",
        agentId: event.entityId,
        timestamp: now,
        duration: 0,
        priority: 5,
      });
    }

    if (event.action === "resumed" || event.action === "activated") {
      animations.push({
        id: makeId(),
        type: "agent-resumed",
        agentId: event.entityId,
        timestamp: now,
        duration: 0,
        priority: 5,
      });
    }

    if (event.action === "error") {
      animations.push({
        id: makeId(),
        type: "agent-error",
        agentId: event.entityId,
        text: (event.details?.message as string) ?? "Agent error",
        timestamp: now,
        duration: 5000,
        priority: 6,
      });
    }
  }

  // --- Approval events ---------------------------------------------------

  if (event.entityType === "approval") {
    if (event.action === "requested" || event.action === "created") {
      animations.push({
        id: makeId(),
        type: "approval-needed",
        agentId,
        timestamp: now,
        duration: 4000,
        priority: 6,
      });
    }
  }

  // --- Budget events -----------------------------------------------------

  if (event.entityType === "budget" || event.type === "budget") {
    const level = event.action ?? (event.details?.level as string);
    if (level === "warning") {
      animations.push({
        id: makeId(),
        type: "budget-warning",
        agentId,
        timestamp: now,
        duration: 4000,
        priority: 5,
      });
    }
    if (level === "exceeded" || level === "paused") {
      animations.push({
        id: makeId(),
        type: "budget-exceeded",
        agentId,
        timestamp: now,
        duration: 0,
        priority: 7,
      });
    }
  }

  // --- Heartbeat acknowledgement -----------------------------------------

  if (event.type === "heartbeat" || event.action === "heartbeat") {
    animations.push({
      id: makeId(),
      type: "heartbeat-pulse",
      agentId,
      timestamp: now,
      duration: 1500,
      priority: 1,
    });
  }

  return animations;
}

// ---------------------------------------------------------------------------
// Animation Queue
// ---------------------------------------------------------------------------

const MAX_QUEUE_SIZE = 100;

export class AnimationQueue {
  private queue: OfficeAnimation[] = [];
  private listeners: Set<(anim: OfficeAnimation) => void> = new Set();

  /** Push one or more animations into the queue. */
  push(...anims: OfficeAnimation[]): void {
    for (const anim of anims) {
      this.queue.push(anim);
      // Notify listeners immediately
      for (const fn of this.listeners) {
        try {
          fn(anim);
        } catch {
          // ignore listener errors
        }
      }
    }
    // Evict oldest low-priority items if queue gets too big
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue.sort((a, b) => b.priority - a.priority);
      this.queue.length = MAX_QUEUE_SIZE;
    }
  }

  /** Drain expired animations (duration elapsed). */
  tick(now: number): OfficeAnimation[] {
    const expired: OfficeAnimation[] = [];
    this.queue = this.queue.filter((a) => {
      if (a.duration > 0 && now - a.timestamp >= a.duration) {
        expired.push(a);
        return false;
      }
      return true;
    });
    return expired;
  }

  /** Get all currently active animations. */
  active(): readonly OfficeAnimation[] {
    return this.queue;
  }

  /** Get active animations for a specific agent. */
  forAgent(agentId: string): OfficeAnimation[] {
    return this.queue.filter((a) => a.agentId === agentId);
  }

  /** Remove all animations of a given type for an agent. */
  clearForAgent(agentId: string, type?: OfficeAnimationType): void {
    this.queue = this.queue.filter(
      (a) => !(a.agentId === agentId && (!type || a.type === type)),
    );
  }

  /** Subscribe to new animations as they arrive. */
  subscribe(fn: (anim: OfficeAnimation) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Clear everything. */
  clear(): void {
    this.queue = [];
  }
}

// Singleton used across the app
export const officeAnimationQueue = new AnimationQueue();

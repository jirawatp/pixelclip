/**
 * OfficeCanvas
 *
 * Thin React wrapper around OfficeRenderer (vanilla JS).
 * 
 * The canvas is created by OfficeRenderer and mounted into a container div.
 * This component provides the container div and manages the renderer lifecycle.
 * 
 * KEY DESIGN: This component must ALWAYS be rendered (never conditionally
 * mounted/unmounted) to prevent the canvas from being destroyed. Use
 * CSS visibility/display to hide it rather than removing from the tree.
 */

import React, { useRef, useEffect } from "react";
import { OfficeRenderer } from "./OfficeRenderer";
import { useOfficeAnimations, useOfficeEventPipe } from "@/hooks/useOfficeAnimations";

interface OfficeCanvasProps {
  agents: any[];
  onAgentClick: (agentId: string) => void;
  onObjectClick: (objectType: string) => void;
  className?: string;
  /** When false, the canvas is hidden but the renderer keeps running. */
  visible?: boolean;
}

export const OfficeCanvas = React.memo(function OfficeCanvas({
  agents,
  onAgentClick,
  onObjectClick,
  className,
  visible = true,
}: OfficeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<OfficeRenderer | null>(null);

  // Keep callbacks in refs so renderer always has latest
  const onAgentClickRef = useRef(onAgentClick);
  onAgentClickRef.current = onAgentClick;
  const onObjectClickRef = useRef(onObjectClick);
  onObjectClickRef.current = onObjectClick;

  // Animation integration
  const companyId = agents[0]?.companyId ?? "";
  useOfficeEventPipe(companyId);
  useOfficeAnimations();

  // Mount renderer exactly once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new OfficeRenderer();
    rendererRef.current = renderer;
    renderer.mount(container, {
      onAgentClick: (id) => onAgentClickRef.current(id),
      onObjectClick: (type) => onObjectClickRef.current(type),
    });

    return () => {
      renderer.unmount();
      rendererRef.current = null;
    };
  }, []); // Mount once

  // Push agent data to renderer whenever agents change
  useEffect(() => {
    if (rendererRef.current && agents.length > 0) {
      rendererRef.current.setAgents(agents);
    }
  }, [agents]);

  return (
    <div
      ref={containerRef}
      className={`${className ?? ""}`}
      style={{
        touchAction: "none",
        // Use visibility:hidden + position:absolute to hide without removing
        // from the DOM. This keeps the canvas element alive and the renderer
        // running (even if at 0-size it just noops).
        ...(visible
          ? {}
          : {
              visibility: "hidden" as const,
              pointerEvents: "none" as const,
            }),
      }}
    />
  );
});

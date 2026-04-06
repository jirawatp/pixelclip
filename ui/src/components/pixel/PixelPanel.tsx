import type { ReactNode } from "react";

interface PixelPanelProps {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  position?: "left" | "right" | "center";
}

export function PixelPanel({ title, onClose, children, className = "", position = "right" }: PixelPanelProps) {
  const positionClass =
    position === "left"
      ? "left-0 top-0 bottom-0"
      : position === "right"
        ? "right-0 top-0 bottom-0"
        : "inset-0 m-auto";

  return (
    <div
      className={`fixed z-50 ${positionClass} w-80 max-h-screen pixel-animate-slide-right ${className}`}
      style={{ imageRendering: "pixelated" }}
    >
      <div className="pixel-panel h-full flex flex-col">
        {/* Title bar */}
        <div className="pixel-panel-title">
          <span>{title}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="pixel-font text-[8px] hover:text-[#FF004D] transition-none"
              aria-label="Close"
            >
              [X]
            </button>
          )}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto pixel-scroll p-3">{children}</div>
      </div>
    </div>
  );
}

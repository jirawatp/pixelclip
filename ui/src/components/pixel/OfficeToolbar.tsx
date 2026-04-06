import { PICO8 } from "@/engine/ProceduralPixelArt";

interface OfficeToolbarProps {
  viewMode: "office" | "list";
  onViewModeChange: (mode: "office" | "list") => void;
  companyName: string;
  agentCount: number;
}

export function OfficeToolbar({ viewMode, onViewModeChange, companyName, agentCount }: OfficeToolbarProps) {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2"
      style={{
        backgroundColor: "rgba(29, 43, 83, 0.85)",
        borderBottom: `2px solid ${PICO8.darkGray}`,
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Company name */}
      <div className="flex items-center gap-3">
        <span className="pixel-font text-[10px]" style={{ color: PICO8.white }}>
          {companyName || "Pixelclip Office"}
        </span>
        <span className="pixel-badge" style={{ backgroundColor: PICO8.blue }}>
          {agentCount} agents
        </span>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewModeChange("office")}
          className={`pixel-btn text-[7px] ${viewMode === "office" ? "pixel-btn-primary" : ""}`}
        >
          Office
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`pixel-btn text-[7px] ${viewMode === "list" ? "pixel-btn-primary" : ""}`}
        >
          List
        </button>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { PixelPanel } from "./PixelPanel";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import { PICO8, AGENT_COLOR_SCHEMES } from "@/engine/ProceduralPixelArt";

interface AgentDetailPanelProps {
  agentId: string;
  companyId: string;
  onClose: () => void;
  onViewFull: (agentId: string) => void;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active" || status === "running"
      ? PICO8.green
      : status === "paused"
        ? PICO8.yellow
        : status === "error"
          ? PICO8.red
          : PICO8.lightGray;

  return (
    <span
      className="inline-block w-2 h-2 pixel-animate-pulse"
      style={{ backgroundColor: color, imageRendering: "pixelated" }}
    />
  );
}

function PixelProgressBar({ value, max, variant = "default" }: { value: number; max: number; variant?: "default" | "warning" | "danger" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fillClass = variant === "danger" ? "danger" : variant === "warning" ? "warning" : "";

  return (
    <div className="pixel-progress">
      <div className={`pixel-progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AgentDetailPanel({ agentId, companyId, onClose, onViewFull }: AgentDetailPanelProps) {
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId,
  });

  const agents = agentsQuery.data ?? [];
  const agentIndex = agents.findIndex((a: any) => a.id === agentId);
  const agent = agents[agentIndex] as any | undefined;

  if (!agent) {
    return (
      <PixelPanel title="Agent" onClose={onClose}>
        <p className="pixel-font text-[8px]" style={{ color: PICO8.lightGray }}>
          Loading...
        </p>
      </PixelPanel>
    );
  }

  const colorScheme = AGENT_COLOR_SCHEMES[agentIndex % AGENT_COLOR_SCHEMES.length];

  return (
    <PixelPanel title={`Agent: ${agent.name}`} onClose={onClose}>
      <div className="space-y-3">
        {/* Avatar & basic info */}
        <div className="flex items-start gap-3">
          {/* Pixel avatar */}
          <div
            className="w-10 h-10 flex-shrink-0"
            style={{
              backgroundColor: colorScheme.shirt,
              border: `2px solid ${PICO8.lightGray}`,
              imageRendering: "pixelated",
            }}
          >
            <div className="w-full h-3" style={{ backgroundColor: colorScheme.hair }} />
            <div className="flex justify-center gap-1 mt-1">
              <div className="w-1 h-1" style={{ backgroundColor: PICO8.black }} />
              <div className="w-1 h-1" style={{ backgroundColor: PICO8.black }} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="pixel-font text-[9px] truncate" style={{ color: PICO8.white }}>
              {agent.name}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <StatusDot status={agent.status ?? "idle"} />
              <span className="pixel-font text-[6px]" style={{ color: PICO8.lightGray }}>
                {agent.status ?? "idle"}
              </span>
            </div>
            <p className="pixel-font text-[6px] mt-1" style={{ color: PICO8.indigo }}>
              {agent.role ?? "Agent"} &middot; {agent.adapterType ?? "unknown"}
            </p>
          </div>
        </div>

        {/* Budget */}
        <div>
          <p className="pixel-font text-[6px] mb-1" style={{ color: PICO8.lightGray }}>
            Budget
          </p>
          <PixelProgressBar value={35} max={100} />
          <p className="pixel-font text-[5px] mt-1" style={{ color: PICO8.indigo }}>
            $35 / $100 used
          </p>
        </div>

        {/* Current task */}
        <div>
          <p className="pixel-font text-[6px] mb-1" style={{ color: PICO8.lightGray }}>
            Current Task
          </p>
          <div
            className="p-2"
            style={{
              backgroundColor: PICO8.black,
              border: `1px solid ${PICO8.darkGray}`,
            }}
          >
            <p className="pixel-font text-[6px]" style={{ color: PICO8.green }}>
              {agent.currentIssueTitle ?? "No active task"}
            </p>
          </div>
        </div>

        {/* Activity log */}
        <div>
          <p className="pixel-font text-[6px] mb-1" style={{ color: PICO8.lightGray }}>
            Recent Activity
          </p>
          <div className="pixel-terminal h-24">
            <div>&gt; Agent initialized</div>
            <div>&gt; Heartbeat received</div>
            <div>&gt; Ready for tasks</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onViewFull(agentId)}
            className="pixel-btn pixel-btn-primary text-[7px]"
          >
            Full Profile
          </button>
          <button className="pixel-btn text-[7px]">
            {agent.status === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
    </PixelPanel>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PixelPanel } from "./PixelPanel";
import { agentsApi } from "@/api/agents";
import { activityApi } from "@/api/activity";
import { issuesApi } from "@/api/issues";
import { queryKeys } from "@/lib/queryKeys";
import { PICO8, AGENT_COLOR_SCHEMES } from "@/engine/ProceduralPixelArt";
import { sfxClick, sfxNav, sfxPause, sfxResume } from "@/engine/PixelAudio";

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
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId,
  });

  const issuesQuery = useQuery({
    queryKey: [...queryKeys.issues.list(companyId), "participant-agent", agentId],
    queryFn: () => issuesApi.list(companyId, { participantAgentId: agentId }),
    enabled: !!companyId && !!agentId,
  });

  const activityQuery = useQuery({
    queryKey: ["agent-activity", companyId, agentId],
    queryFn: () => activityApi.list(companyId, { agentId, entityType: "run" }),
    enabled: !!companyId && !!agentId,
  });

  const pauseMutation = useMutation({
    mutationFn: () => agentsApi.pause(agentId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => agentsApi.resume(agentId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const handleTogglePause = () => {
    if (agent?.status === "paused") {
      sfxResume();
      resumeMutation.mutate();
    } else {
      sfxPause();
      pauseMutation.mutate();
    }
  };

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

  const colorScheme = AGENT_COLOR_SCHEMES[agentIndex % AGENT_COLOR_SCHEMES.length] || AGENT_COLOR_SCHEMES[0];
  
  // Budget calculations
  const budgetUsdCents = typeof agent.budgetMonthlyCents === "number" ? agent.budgetMonthlyCents : 0;
  const spentUsdCents = typeof agent.spentMonthlyCents === "number" ? agent.spentMonthlyCents : 0;
  const budgetUsd = budgetUsdCents / 100;
  const spentUsd = spentUsdCents / 100;

  // Active task calculation
  const issues = issuesQuery.data ?? [];
  const activeIssue = issues.find((issue: any) => issue.status === "in_progress" || issue.status === "todo");
  const issueTitle = activeIssue ? activeIssue.title : "No active task";

  // Activity calculation
  const activities = activityQuery.data ?? [];
  const recentActivities = activities.slice(0, 3);

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
          <PixelProgressBar value={spentUsdCents} max={budgetUsdCents} />
          <p className="pixel-font text-[5px] mt-1" style={{ color: PICO8.indigo }}>
            ${spentUsd.toFixed(2)} / ${budgetUsd.toFixed(2)} used
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
            <p className="pixel-font text-[6px] truncate" style={{ color: PICO8.green }} title={issueTitle}>
              {issueTitle}
            </p>
          </div>
        </div>

        {/* Activity log */}
        <div>
          <p className="pixel-font text-[6px] mb-1" style={{ color: PICO8.lightGray }}>
            Recent Activity
          </p>
          <div className="pixel-terminal h-24 overflow-hidden text-[5px]">
            {activityQuery.isLoading ? (
              <div>&gt; Loading activity...</div>
            ) : recentActivities.length === 0 ? (
              <div>&gt; No recent activity</div>
            ) : (
              recentActivities.map((act: any) => (
                <div key={act.id} className="truncate truncate-lines-2 break-all whitespace-normal">
                  &gt; {act.message || act.action}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { sfxNav(); onViewFull(agentId); }}
            className="pixel-btn pixel-btn-primary text-[7px]"
          >
            Full Profile
          </button>
          <button 
            className="pixel-btn text-[7px]" 
            onClick={handleTogglePause}
            disabled={pauseMutation.isPending || resumeMutation.isPending}
          >
            {pauseMutation.isPending || resumeMutation.isPending 
              ? "..." 
              : agent.status === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
    </PixelPanel>
  );
}

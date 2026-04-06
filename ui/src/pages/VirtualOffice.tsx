import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { useNavigate } from "@/lib/router";
import { agentsApi } from "@/api/agents";
import { issuesApi } from "@/api/issues";
import { dashboardApi } from "@/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";
import { AgentDetailPanel } from "@/components/pixel/AgentDetailPanel";
import { OrgBoardModal } from "@/components/pixel/OrgBoardModal";
import { TaskBoardModal } from "@/components/pixel/TaskBoardModal";
import { ControlRoomModal } from "@/components/pixel/ControlRoomModal";
import { OfficeCanvas } from "@/engine/OfficeCanvas";
import { OfficeToolbar } from "@/components/pixel/OfficeToolbar";

type ModalType = "org-board" | "whiteboard" | "filing-cabinet" | "control-room" | null;

export function VirtualOffice() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [viewMode, setViewMode] = useState<"office" | "list">("office");

  const companyId = selectedCompany?.id ?? "";

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId,
    refetchInterval: 15000,
  });

  const issuesQuery = useQuery({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: !!companyId,
    refetchInterval: 10000,
  });

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(companyId),
    queryFn: () => dashboardApi.summary(companyId),
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setActiveModal(null);
  }, []);

  const handleObjectClick = useCallback((objectType: string) => {
    setActiveModal(objectType as ModalType);
    setSelectedAgentId(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedAgentId(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleViewAgent = useCallback(
    (agentId: string) => {
      navigate(`/agents/${agentId}`);
    },
    [navigate],
  );

  const handleViewIssue = useCallback(
    (issueId: string) => {
      navigate(`/issues/${issueId}`);
    },
    [navigate],
  );

  const agents = agentsQuery.data ?? [];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#1D2B53]">
      {/* Toolbar */}
      <OfficeToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        companyName={selectedCompany?.name ?? ""}
        agentCount={agents.length}
      />

      {/* Main office canvas */}
      {viewMode === "office" ? (
        <OfficeCanvas
          agents={agents}
          onAgentClick={handleAgentClick}
          onObjectClick={handleObjectClick}
          className="h-full w-full"
        />
      ) : (
        <div className="h-full w-full overflow-auto p-4">
          {/* Fallback list view - pixel styled */}
          <div className="pixel-panel mx-auto max-w-4xl">
            <div className="pixel-panel-title">Agents</div>
            <div className="space-y-2 p-4">
              {agents.map((agent: any) => (
                <button
                  key={agent.id}
                  onClick={() => handleAgentClick(agent.id)}
                  className="pixel-btn w-full text-left"
                >
                  <span className="pixel-font text-xs">
                    {agent.name} — {agent.role ?? "Agent"}
                  </span>
                  <span className="ml-2 text-[10px] opacity-70">
                    {agent.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent detail side panel */}
      {selectedAgentId && (
        <AgentDetailPanel
          agentId={selectedAgentId}
          companyId={companyId}
          onClose={handleClosePanel}
          onViewFull={handleViewAgent}
        />
      )}

      {/* Modals for interactive objects */}
      {activeModal === "org-board" && (
        <OrgBoardModal
          companyId={companyId}
          onClose={handleCloseModal}
          onAgentClick={handleAgentClick}
        />
      )}

      {activeModal === "whiteboard" && (
        <TaskBoardModal
          companyId={companyId}
          onClose={handleCloseModal}
          onIssueClick={handleViewIssue}
        />
      )}

      {activeModal === "control-room" && (
        <ControlRoomModal
          companyId={companyId}
          dashboardData={dashboardQuery.data}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import { PICO8, AGENT_COLOR_SCHEMES } from "@/engine/ProceduralPixelArt";
import { useDialog } from "@/context/DialogContext";

interface OrgBoardModalProps {
  companyId: string;
  onClose: () => void;
  onAgentClick: (agentId: string) => void;
}

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: string;
  managerId: string | null;
  children: AgentNode[];
  colorIndex: number;
}

function buildTree(agents: any[]): AgentNode[] {
  const nodes: AgentNode[] = agents.map((a: any, i: number) => ({
    id: a.id,
    name: a.name ?? "Agent",
    role: a.role ?? "Agent",
    status: a.status ?? "idle",
    managerId: a.managerId ?? null,
    children: [],
    colorIndex: i,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const roots: AgentNode[] = [];

  for (const node of nodes) {
    if (node.managerId && nodeMap.has(node.managerId)) {
      nodeMap.get(node.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function OrgNode({
  node,
  onAgentClick,
  depth = 0,
}: {
  node: AgentNode;
  onAgentClick: (id: string) => void;
  depth?: number;
}) {
  const scheme = AGENT_COLOR_SCHEMES[node.colorIndex % AGENT_COLOR_SCHEMES.length];
  const statusColor =
    node.status === "active" || node.status === "running"
      ? PICO8.green
      : node.status === "paused"
        ? PICO8.yellow
        : node.status === "error"
          ? PICO8.red
          : PICO8.lightGray;

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <button
        onClick={() => onAgentClick(node.id)}
        className="pixel-panel p-2 hover:opacity-80 cursor-pointer min-w-[120px]"
        style={{ borderColor: scheme.shirt }}
      >
        <div className="flex items-center gap-2">
          {/* Mini avatar */}
          <div
            className="w-6 h-6 flex-shrink-0"
            style={{
              backgroundColor: scheme.shirt,
              border: `1px solid ${PICO8.lightGray}`,
            }}
          />
          <div>
            <p className="pixel-font text-[7px]" style={{ color: PICO8.white }}>
              {node.name}
            </p>
            <div className="flex items-center gap-1">
              <span
                className="inline-block w-1.5 h-1.5"
                style={{ backgroundColor: statusColor }}
              />
              <span className="pixel-font text-[5px]" style={{ color: PICO8.indigo }}>
                {node.role}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Children */}
      {node.children.length > 0 && (
        <>
          {/* Connector line */}
          <div
            className="w-0.5 h-6"
            style={{ backgroundColor: PICO8.lightGray }}
          />
          <div className="flex gap-4 items-start">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Horizontal connector */}
                {node.children.length > 1 && (
                  <div
                    className="h-0.5 mb-1"
                    style={{
                      backgroundColor: PICO8.lightGray,
                      width: "100%",
                      minWidth: 20,
                    }}
                  />
                )}
                <OrgNode node={child} onAgentClick={onAgentClick} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrgBoardModal({ companyId, onClose, onAgentClick }: OrgBoardModalProps) {
  const { openNewAgent } = useDialog();
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId,
  });

  const agents = agentsQuery.data ?? [];
  const tree = buildTree(agents);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pixel-animate-fade"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pixel-panel w-[90vw] max-w-4xl max-h-[85vh] flex flex-col">
        <div className="pixel-panel-title">
          <span>Organization Board</span>
          <button
            onClick={onClose}
            className="pixel-font text-[8px] hover:text-[#FF004D]"
          >
            [X]
          </button>
        </div>

        <div className="flex-1 overflow-auto pixel-scroll p-6">
          {tree.length === 0 ? (
            <p className="pixel-font text-[8px] text-center" style={{ color: PICO8.lightGray }}>
              No agents yet. Hire your first agent!
            </p>
          ) : (
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-2">
                {tree.map((root) => (
                  <OrgNode key={root.id} node={root} onAgentClick={onAgentClick} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 flex gap-2 justify-end" style={{ borderTop: `2px solid ${PICO8.darkGray}` }}>
          <button onClick={openNewAgent} className="pixel-btn pixel-btn-primary text-[7px]">
            Hire Agent
          </button>
          <button onClick={onClose} className="pixel-btn text-[7px]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

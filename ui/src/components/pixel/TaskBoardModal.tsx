import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "@/api/issues";
import { queryKeys } from "@/lib/queryKeys";
import { PICO8 } from "@/engine/ProceduralPixelArt";

interface TaskBoardModalProps {
  companyId: string;
  onClose: () => void;
  onIssueClick: (issueId: string) => void;
}

const STATUS_COLUMNS = [
  { key: "backlog", label: "Backlog", color: PICO8.lightGray },
  { key: "in_progress", label: "In Progress", color: PICO8.blue },
  { key: "done", label: "Done", color: PICO8.green },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  urgent: PICO8.red,
  high: PICO8.orange,
  medium: PICO8.yellow,
  low: PICO8.lightGray,
};

function categorizeStatus(status: string): string {
  const s = status?.toLowerCase() ?? "backlog";
  if (s === "done" || s === "closed" || s === "completed") return "done";
  if (s === "in_progress" || s === "running" || s === "active") return "in_progress";
  return "backlog";
}

export function TaskBoardModal({ companyId, onClose, onIssueClick }: TaskBoardModalProps) {
  const issuesQuery = useQuery({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: !!companyId,
  });

  const issues = (issuesQuery.data ?? []) as any[];

  const columns = STATUS_COLUMNS.map((col) => ({
    ...col,
    issues: issues.filter((issue) => categorizeStatus(issue.status) === col.key),
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pixel-animate-fade"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pixel-panel w-[90vw] max-w-5xl max-h-[85vh] flex flex-col">
        <div className="pixel-panel-title">
          <span>Task Board</span>
          <button onClick={onClose} className="pixel-font text-[8px] hover:text-[#FF004D]">[X]</button>
        </div>

        <div className="flex-1 overflow-auto pixel-scroll p-4">
          <div className="flex gap-4 min-w-[600px]">
            {columns.map((col) => (
              <div key={col.key} className="flex-1 min-w-[180px]">
                {/* Column header */}
                <div
                  className="pixel-font text-[7px] p-2 mb-2 text-center"
                  style={{
                    backgroundColor: PICO8.darkGray,
                    color: col.color,
                    border: `1px solid ${PICO8.lightGray}`,
                  }}
                >
                  {col.label} ({col.issues.length})
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {col.issues.slice(0, 20).map((issue: any) => {
                    const priorityColor = PRIORITY_COLORS[issue.priority?.toLowerCase()] ?? PICO8.lightGray;

                    return (
                      <button
                        key={issue.id}
                        onClick={() => onIssueClick(issue.identifier ?? issue.id)}
                        className="w-full text-left p-2 hover:opacity-80 cursor-pointer"
                        style={{
                          backgroundColor: PICO8.yellow,
                          border: `2px solid ${PICO8.orange}`,
                          boxShadow: `2px 2px 0 ${PICO8.brown}`,
                          imageRendering: "pixelated",
                        }}
                      >
                        {/* Priority strip */}
                        <div className="flex items-center gap-1 mb-1">
                          <span
                            className="inline-block w-2 h-2"
                            style={{ backgroundColor: priorityColor }}
                          />
                          <span
                            className="pixel-font text-[5px]"
                            style={{ color: PICO8.darkGray }}
                          >
                            {issue.identifier ?? ""}
                          </span>
                        </div>

                        {/* Title */}
                        <p
                          className="pixel-font text-[6px] leading-tight"
                          style={{ color: PICO8.black }}
                        >
                          {(issue.title ?? "Untitled").slice(0, 50)}
                        </p>

                        {/* Assignee */}
                        {issue.assigneeName && (
                          <p
                            className="pixel-font text-[5px] mt-1"
                            style={{ color: PICO8.darkGray }}
                          >
                            {issue.assigneeName}
                          </p>
                        )}
                      </button>
                    );
                  })}

                  {col.issues.length === 0 && (
                    <p
                      className="pixel-font text-[6px] text-center p-4"
                      style={{ color: PICO8.indigo }}
                    >
                      Empty
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 flex gap-2 justify-end" style={{ borderTop: `2px solid ${PICO8.darkGray}` }}>
          <button className="pixel-btn pixel-btn-success text-[7px]">
            New Task
          </button>
          <button onClick={onClose} className="pixel-btn text-[7px]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

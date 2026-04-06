import { PICO8 } from "@/engine/ProceduralPixelArt";

interface ControlRoomModalProps {
  companyId: string;
  dashboardData?: any;
  onClose: () => void;
}

function PixelMeter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const blocks = 20;
  const filled = Math.round((pct / 100) * blocks);

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="pixel-font text-[6px]" style={{ color: PICO8.lightGray }}>{label}</span>
        <span className="pixel-font text-[6px]" style={{ color }}>{value}</span>
      </div>
      <div className="flex gap-px">
        {Array.from({ length: blocks }, (_, i) => (
          <div
            key={i}
            className="h-3 flex-1"
            style={{
              backgroundColor: i < filled ? color : PICO8.darkGray,
              border: `1px solid ${PICO8.black}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PixelBarChart({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(1, ...data);

  return (
    <div className="mb-3">
      <p className="pixel-font text-[6px] mb-2" style={{ color: PICO8.lightGray }}>{label}</p>
      <div className="flex items-end gap-1 h-16" style={{ borderBottom: `1px solid ${PICO8.darkGray}` }}>
        {data.map((val, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: `${(val / max) * 100}%`,
              minHeight: val > 0 ? 2 : 0,
              backgroundColor: [PICO8.blue, PICO8.green, PICO8.yellow, PICO8.orange, PICO8.pink, PICO8.red, PICO8.indigo][i % 7],
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ControlRoomModal({ companyId, dashboardData, onClose }: ControlRoomModalProps) {
  const data = dashboardData ?? {};
  const totalCost = data.totalCost ?? 0;
  const agentCount = data.agentCount ?? 0;
  const activeRuns = data.activeRuns ?? 0;
  const completedTasks = data.completedTasks ?? 0;
  const totalTasks = data.totalTasks ?? 0;
  const dailyActivity = data.dailyActivity ?? [3, 7, 5, 12, 8, 15, 10];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pixel-animate-fade"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pixel-panel w-[90vw] max-w-3xl max-h-[85vh] flex flex-col">
        <div className="pixel-panel-title">
          <span>Control Room - Dashboard</span>
          <button onClick={onClose} className="pixel-font text-[8px] hover:text-[#FF004D]">[X]</button>
        </div>

        <div className="flex-1 overflow-auto pixel-scroll p-4">
          {/* Big numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Agents", value: agentCount, color: PICO8.blue },
              { label: "Active Runs", value: activeRuns, color: PICO8.green },
              { label: "Completed", value: completedTasks, color: PICO8.yellow },
              { label: "Total Cost", value: `$${totalCost}`, color: PICO8.orange },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 text-center"
                style={{
                  backgroundColor: PICO8.black,
                  border: `2px solid ${stat.color as string}`,
                }}
              >
                <p className="pixel-font text-[14px]" style={{ color: stat.color as string }}>
                  {stat.value}
                </p>
                <p className="pixel-font text-[5px] mt-1" style={{ color: PICO8.lightGray }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Meters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="p-3"
              style={{ backgroundColor: PICO8.black, border: `1px solid ${PICO8.darkGray}` }}
            >
              <PixelMeter
                label="Task Completion"
                value={completedTasks}
                max={Math.max(totalTasks, 1)}
                color={PICO8.green}
              />
              <PixelMeter
                label="Budget Used"
                value={totalCost}
                max={1000}
                color={totalCost > 800 ? PICO8.red : totalCost > 500 ? PICO8.orange : PICO8.blue}
              />
              <PixelMeter
                label="Agent Utilization"
                value={activeRuns}
                max={Math.max(agentCount, 1)}
                color={PICO8.yellow}
              />
            </div>

            <div
              className="p-3"
              style={{ backgroundColor: PICO8.black, border: `1px solid ${PICO8.darkGray}` }}
            >
              <PixelBarChart data={dailyActivity} label="Activity (7 days)" />
            </div>
          </div>
        </div>

        <div className="p-3 flex justify-end" style={{ borderTop: `2px solid ${PICO8.darkGray}` }}>
          <button onClick={onClose} className="pixel-btn text-[7px]">Close</button>
        </div>
      </div>
    </div>
  );
}

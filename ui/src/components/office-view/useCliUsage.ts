// @ts-nocheck
import { useRef } from "react";

export function useCliUsage(tasks: any[]) {
  const cliUsageRef = useRef<any[]>([]);
  return {
    cliStatus: "idle",
    cliUsage: [],
    cliUsageRef: cliUsageRef,
    refreshing: false,
    handleRefreshUsage: () => {},
  };
}

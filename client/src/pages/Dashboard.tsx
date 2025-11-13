import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Edit3, XCircle, Clock, Trash2 } from "lucide-react";
import StatusCard from "@/components/StatusCard";
import BotStatusIndicator from "@/components/BotStatusIndicator";
import ActivityLog, { LogEntry } from "@/components/ActivityLog";
import ConfigPanel from "@/components/ConfigPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { BotStats, BotLog } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<BotStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 2000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery<BotLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 2000,
  });

  const { data: config } = useQuery<{ sourceChatId: string; targetChannels: string[] }>({
    queryKey: ["/api/config"],
  });

  const logs: LogEntry[] = logsData?.map((log) => ({
    id: log.id,
    timestamp: new Date(log.timestamp),
    type: log.type as "forward" | "edit" | "delete" | "error",
    sourceChatId: log.sourceChatId,
    sourceMessageId: log.sourceMessageId,
    targetMessageId: log.targetMessageId || undefined,
    status: log.status,
    message: log.message || undefined,
  })) || [];

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Telegram Bot Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <BotStatusIndicator isRunning={stats?.isRunning || false} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatusCard
            title="Messages Forwarded"
            value={statsLoading ? "..." : stats?.totalForwarded || 0}
            icon={MessageSquare}
            variant="success"
            description="Total forwarded"
          />
          <StatusCard
            title="Messages Edited"
            value={statsLoading ? "..." : stats?.totalEdited || 0}
            icon={Edit3}
            variant="warning"
            description="Synced edits"
          />
          <StatusCard
            title="Messages Deleted"
            value={statsLoading ? "..." : stats?.totalDeleted || 0}
            icon={Trash2}
            variant="error"
            description="Total deleted"
          />
          <StatusCard
            title="Errors"
            value={statsLoading ? "..." : stats?.errors || 0}
            icon={XCircle}
            variant="error"
            description="Failed operations"
          />
          <StatusCard
            title="Uptime"
            value={statsLoading ? "..." : formatUptime(stats?.uptime || 0)}
            icon={Clock}
            description="Current session"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityLog logs={logs} />
          </div>
          <div>
            <ConfigPanel
              sourceChatId={config?.sourceChatId || "Loading..."}
              targetChannels={config?.targetChannels || ["", "", "", ""]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
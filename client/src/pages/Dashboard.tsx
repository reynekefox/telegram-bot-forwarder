import { useState, useEffect } from "react";
import { MessageSquare, Edit3, XCircle, Clock } from "lucide-react";
import StatusCard from "@/components/StatusCard";
import BotStatusIndicator from "@/components/BotStatusIndicator";
import ActivityLog, { LogEntry } from "@/components/ActivityLog";
import ConfigPanel from "@/components/ConfigPanel";
import ThemeToggle from "@/components/ThemeToggle";

export default function Dashboard() {
  const [isRunning] = useState(true);
  
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date(Date.now() - 1000 * 30),
      type: "forward",
      sourceChatId: "-1003141215929",
      sourceMessageId: 1234,
      targetMessageId: 5678,
      status: "success",
      message: "New message forwarded successfully",
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      type: "edit",
      sourceChatId: "-1003141215929",
      sourceMessageId: 1230,
      targetMessageId: 5674,
      status: "success",
      message: "Message edit synchronized",
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      type: "forward",
      sourceChatId: "-1003141215929",
      sourceMessageId: 1228,
      targetMessageId: 5672,
      status: "success",
      message: "Channel post forwarded",
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: Math.random() > 0.7 ? "edit" : "forward",
        sourceChatId: "-1003141215929",
        sourceMessageId: Math.floor(Math.random() * 9000) + 1000,
        targetMessageId: Math.floor(Math.random() * 9000) + 5000,
        status: "success",
        message:
          Math.random() > 0.7
            ? "Message edit synchronized"
            : "New message forwarded successfully",
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 50));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Telegram Bot Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <BotStatusIndicator isRunning={isRunning} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatusCard
            title="Messages Forwarded"
            value={1247}
            icon={MessageSquare}
            variant="success"
            description="Total forwarded"
          />
          <StatusCard
            title="Messages Edited"
            value={89}
            icon={Edit3}
            variant="warning"
            description="Synced edits"
          />
          <StatusCard
            title="Errors"
            value={3}
            icon={XCircle}
            variant="error"
            description="Failed operations"
          />
          <StatusCard
            title="Uptime"
            value="12h 34m"
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
              sourceChatId="-1003141215929"
              targetChatId="-1003443779414"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
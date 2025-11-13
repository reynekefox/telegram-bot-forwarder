import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, CheckCircle2, Edit3, XCircle } from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "forward" | "edit" | "error";
  sourceChatId: string;
  sourceMessageId: number;
  targetMessageId?: number;
  status: string;
  message?: string;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

export default function ActivityLog({ logs }: ActivityLogProps) {
  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "forward":
        return <ArrowRight className="h-4 w-4 text-primary" />;
      case "edit":
        return <Edit3 className="h-4 w-4 text-amber-600 dark:text-amber-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />;
    }
  };

  const getLogVariant = (type: LogEntry["type"]) => {
    switch (type) {
      case "forward":
        return "default";
      case "edit":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card data-testid="card-activity-log">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No activity yet
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                  data-testid={`log-entry-${log.id}`}
                >
                  <div className="mt-0.5">{getLogIcon(log.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={getLogVariant(log.type)} className="text-xs">
                        {log.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="font-mono text-xs text-muted-foreground">
                        Message #{log.sourceMessageId}
                        {log.targetMessageId && (
                          <>
                            {" "}
                            <ArrowRight className="inline h-3 w-3" /> #
                            {log.targetMessageId}
                          </>
                        )}
                      </div>
                      {log.message && (
                        <p className="text-sm">{log.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface ConfigPanelProps {
  sourceChatId: string;
  targetChatId: string;
}

export default function ConfigPanel({
  sourceChatId,
  targetChatId,
}: ConfigPanelProps) {
  return (
    <Card data-testid="card-config">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Source Channel ID
          </label>
          <div className="font-mono text-sm p-2 bg-muted rounded-md" data-testid="text-source-chat">
            {sourceChatId}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Target Channel ID
          </label>
          <div className="font-mono text-sm p-2 bg-muted rounded-md" data-testid="text-target-chat">
            {targetChatId}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
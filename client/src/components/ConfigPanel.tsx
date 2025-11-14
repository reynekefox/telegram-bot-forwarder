import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, RefreshCw, Pause, Play } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConfigPanelProps {
  sourceChatId: string;
  targetChannels: string[];
  isPaused?: boolean;
}

export default function ConfigPanel({
  sourceChatId,
  targetChannels,
  isPaused = false,
}: ConfigPanelProps) {
  const [channels, setChannels] = useState<string[]>(targetChannels || ["", "", "", ""]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update local state when targetChannels prop changes
  useEffect(() => {
    if (targetChannels && targetChannels.length > 0) {
      setChannels(targetChannels);
    }
  }, [targetChannels]);

  const saveChannelsMutation = useMutation({
    mutationFn: async (newChannels: string[]) => {
      return await apiRequest("POST", "/api/config/channels", { channels: newChannels });
    },
    onSuccess: () => {
      toast({
        title: "Channels updated",
        description: "Target channels have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save channels: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const restartBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/bot/restart");
    },
    onSuccess: () => {
      toast({
        title: "Restart requested",
        description: "Please manually restart the workflow to apply changes.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to restart bot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const pauseBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/bot/pause");
    },
    onSuccess: () => {
      toast({
        title: "Bot paused",
        description: "Messages will not be forwarded until resumed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to pause bot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const resumeBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/bot/resume");
    },
    onSuccess: () => {
      toast({
        title: "Bot resumed",
        description: "Messages will now be forwarded normally.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to resume bot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveChannelsMutation.mutate(channels);
  };

  const handleRestart = () => {
    restartBotMutation.mutate();
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      resumeBotMutation.mutate();
    } else {
      pauseBotMutation.mutate();
    }
  };

  const handleChannelChange = (index: number, value: string) => {
    const newChannels = [...channels];
    newChannels[index] = value;
    setChannels(newChannels);
  };

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

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Target Channels (up to 4)
          </label>
          {[0, 1, 2, 3].map((index) => (
            <Input
              key={index}
              type="text"
              placeholder={`Target Channel ${index + 1} ID (optional)`}
              value={channels[index] || ""}
              onChange={(e) => handleChannelChange(index, e.target.value)}
              className="font-mono text-sm"
              data-testid={`input-target-channel-${index + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saveChannelsMutation.isPending}
            className="flex-1"
            data-testid="button-save-channels"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveChannelsMutation.isPending ? "Saving..." : "Save Channels"}
          </Button>
        </div>

        <div className="pt-2 border-t space-y-2">
          <Button
            onClick={handlePauseToggle}
            disabled={pauseBotMutation.isPending || resumeBotMutation.isPending}
            variant={isPaused ? "default" : "secondary"}
            className="w-full"
            data-testid="button-pause-toggle"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                {resumeBotMutation.isPending ? "Resuming..." : "Resume Forwarding"}
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                {pauseBotMutation.isPending ? "Pausing..." : "Pause Forwarding"}
              </>
            )}
          </Button>
          <Button
            onClick={handleRestart}
            disabled={restartBotMutation.isPending}
            variant="outline"
            className="w-full"
            data-testid="button-restart-bot"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {restartBotMutation.isPending ? "Restarting..." : "Restart Bot"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
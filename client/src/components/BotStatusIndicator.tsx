import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

interface BotStatusIndicatorProps {
  isRunning: boolean;
}

export default function BotStatusIndicator({ isRunning }: BotStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2" data-testid="container-bot-status">
      <Badge
        variant={isRunning ? "default" : "secondary"}
        className="flex items-center gap-1.5"
        data-testid="badge-bot-status"
      >
        <Circle
          className={`h-2 w-2 fill-current ${
            isRunning ? "animate-pulse" : ""
          }`}
        />
        {isRunning ? "Running" : "Stopped"}
      </Badge>
    </div>
  );
}
import StatusCard from "../StatusCard";
import { MessageSquare, Edit3, XCircle, Clock } from "lucide-react";

export default function StatusCardExample() {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
  );
}
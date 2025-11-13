import ActivityLog, { LogEntry } from "../ActivityLog";

export default function ActivityLogExample() {
  const mockLogs: LogEntry[] = [
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
    {
      id: "4",
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      type: "error",
      sourceChatId: "-1003141215929",
      sourceMessageId: 1225,
      status: "failed",
      message: "Failed to forward: Rate limit exceeded",
    },
  ];

  return (
    <div className="p-4">
      <ActivityLog logs={mockLogs} />
    </div>
  );
}
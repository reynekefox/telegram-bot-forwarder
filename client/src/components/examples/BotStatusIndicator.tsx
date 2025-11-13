import BotStatusIndicator from "../BotStatusIndicator";

export default function BotStatusIndicatorExample() {
  return (
    <div className="p-4 space-y-4">
      <BotStatusIndicator isRunning={true} />
      <BotStatusIndicator isRunning={false} />
    </div>
  );
}
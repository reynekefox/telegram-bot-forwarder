import { type BotLog, type InsertBotLog, type BotStats } from "@shared/schema";
import { randomUUID } from "crypto";

interface ForwardedMessage {
  chatId: string;
  messageId: number;
}

export interface IStorage {
  // Bot logs
  addLog(log: InsertBotLog): Promise<BotLog>;
  getLogs(limit?: number): Promise<BotLog[]>;
  findLog(sourceChatId: string, sourceMessageId: number, type: string): Promise<BotLog | undefined>;
  
  // Bot stats
  getStats(): Promise<BotStats>;
  incrementForwarded(): void;
  incrementEdited(): void;
  incrementDeleted(): void;
  incrementErrors(): void;
  setBotRunning(running: boolean): void;
  
  // Forward mapping - stores chat ID and message ID pairs
  setForwardMapping(sourceChatId: string, sourceMessageId: number, forwardedMessages: ForwardedMessage[]): void;
  getForwardMapping(sourceChatId: string, sourceMessageId: number): ForwardedMessage[] | undefined;
  deleteForwardMapping(sourceChatId: string, sourceMessageId: number): void;
  
  // Target channels configuration
  setTargetChannels(channels: string[]): void;
  getTargetChannels(): string[];
}

export class MemStorage implements IStorage {
  private logs: BotLog[];
  private forwardMap: Map<string, ForwardedMessage[]>;
  private stats: {
    totalForwarded: number;
    totalEdited: number;
    totalDeleted: number;
    errors: number;
    startTime: number;
  };
  private botRunning: boolean;
  private targetChannels: string[];

  constructor() {
    this.logs = [];
    this.forwardMap = new Map();
    this.stats = {
      totalForwarded: 0,
      totalEdited: 0,
      totalDeleted: 0,
      errors: 0,
      startTime: Date.now(),
    };
    this.botRunning = false;
    // Initialize with one target channel from env, others empty
    this.targetChannels = [
      process.env.TARGET_CHAT_ID || "",
      "",
      "",
      ""
    ];
  }

  setBotRunning(running: boolean): void {
    this.botRunning = running;
    // Always reset the baseline - either for new start or clean stop
    this.stats.startTime = Date.now();
  }

  async addLog(insertLog: InsertBotLog): Promise<BotLog> {
    const log: BotLog = {
      id: randomUUID(),
      timestamp: new Date(),
      ...insertLog,
      message: insertLog.message || null,
      targetMessageId: insertLog.targetMessageId || null,
      messageText: insertLog.messageText || null,
      hasPhoto: insertLog.hasPhoto || null,
      photoUrl: insertLog.photoUrl || null,
    };
    this.logs.unshift(log);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    return log;
  }

  async getLogs(limit: number = 50): Promise<BotLog[]> {
    return this.logs.slice(0, limit);
  }

  async findLog(sourceChatId: string, sourceMessageId: number, type: string): Promise<BotLog | undefined> {
    return this.logs.find(
      log => log.sourceChatId === sourceChatId && 
             log.sourceMessageId === sourceMessageId && 
             log.type === type
    );
  }

  async getStats(): Promise<BotStats> {
    // Only count uptime when bot is actually running
    const uptime = this.botRunning 
      ? Math.floor((Date.now() - this.stats.startTime) / 1000)
      : 0;
    return {
      isRunning: this.botRunning,
      totalForwarded: this.stats.totalForwarded,
      totalEdited: this.stats.totalEdited,
      totalDeleted: this.stats.totalDeleted,
      errors: this.stats.errors,
      uptime,
    };
  }

  incrementForwarded(): void {
    this.stats.totalForwarded++;
  }

  incrementEdited(): void {
    this.stats.totalEdited++;
  }

  incrementDeleted(): void {
    this.stats.totalDeleted++;
  }

  incrementErrors(): void {
    this.stats.errors++;
  }

  setForwardMapping(sourceChatId: string, sourceMessageId: number, forwardedMessages: ForwardedMessage[]): void {
    const key = `${sourceChatId}:${sourceMessageId}`;
    this.forwardMap.set(key, forwardedMessages);
  }

  getForwardMapping(sourceChatId: string, sourceMessageId: number): ForwardedMessage[] | undefined {
    const key = `${sourceChatId}:${sourceMessageId}`;
    return this.forwardMap.get(key);
  }

  deleteForwardMapping(sourceChatId: string, sourceMessageId: number): void {
    const key = `${sourceChatId}:${sourceMessageId}`;
    this.forwardMap.delete(key);
  }

  setTargetChannels(channels: string[]): void {
    // Ensure we always have exactly 4 slots
    this.targetChannels = [...channels.slice(0, 4)];
    while (this.targetChannels.length < 4) {
      this.targetChannels.push("");
    }
  }

  getTargetChannels(): string[] {
    return [...this.targetChannels];
  }
}

export const storage = new MemStorage();

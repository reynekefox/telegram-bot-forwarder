import { type BotLog, type InsertBotLog, type BotStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Bot logs
  addLog(log: InsertBotLog): Promise<BotLog>;
  getLogs(limit?: number): Promise<BotLog[]>;
  
  // Bot stats
  getStats(): Promise<BotStats>;
  incrementForwarded(): void;
  incrementEdited(): void;
  incrementErrors(): void;
  setBotRunning(running: boolean): void;
  
  // Forward mapping
  setForwardMapping(sourceChatId: string, sourceMessageId: number, targetMessageId: number): void;
  getForwardMapping(sourceChatId: string, sourceMessageId: number): number | undefined;
}

export class MemStorage implements IStorage {
  private logs: BotLog[];
  private forwardMap: Map<string, number>;
  private stats: {
    totalForwarded: number;
    totalEdited: number;
    errors: number;
    startTime: number;
  };
  private botRunning: boolean;

  constructor() {
    this.logs = [];
    this.forwardMap = new Map();
    this.stats = {
      totalForwarded: 0,
      totalEdited: 0,
      errors: 0,
      startTime: Date.now(),
    };
    this.botRunning = false;
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

  async getStats(): Promise<BotStats> {
    // Only count uptime when bot is actually running
    const uptime = this.botRunning 
      ? Math.floor((Date.now() - this.stats.startTime) / 1000)
      : 0;
    return {
      isRunning: this.botRunning,
      totalForwarded: this.stats.totalForwarded,
      totalEdited: this.stats.totalEdited,
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

  incrementErrors(): void {
    this.stats.errors++;
  }

  setForwardMapping(sourceChatId: string, sourceMessageId: number, targetMessageId: number): void {
    const key = `${sourceChatId}:${sourceMessageId}`;
    this.forwardMap.set(key, targetMessageId);
  }

  getForwardMapping(sourceChatId: string, sourceMessageId: number): number | undefined {
    const key = `${sourceChatId}:${sourceMessageId}`;
    return this.forwardMap.get(key);
  }
}

export const storage = new MemStorage();

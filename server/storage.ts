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
  incrementForwarded(): Promise<void>;
  incrementEdited(): Promise<void>;
  incrementDeleted(): Promise<void>;
  incrementErrors(): Promise<void>;
  setBotRunning(running: boolean): Promise<void>;
  
  // Bot pause state
  setPaused(paused: boolean): Promise<void>;
  isPaused(): Promise<boolean>;
  
  // Forward mapping - stores chat ID and message ID pairs
  setForwardMapping(sourceChatId: string, sourceMessageId: number, forwardedMessages: ForwardedMessage[]): Promise<void>;
  getForwardMapping(sourceChatId: string, sourceMessageId: number): Promise<ForwardedMessage[] | undefined>;
  deleteForwardMapping(sourceChatId: string, sourceMessageId: number): Promise<void>;
  
  // Target channels configuration
  setTargetChannels(channels: string[]): Promise<void>;
  getTargetChannels(): Promise<string[]>;
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
  private paused: boolean;
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
    this.paused = false;
    // Initialize with one target channel from env, others empty
    this.targetChannels = [
      process.env.TARGET_CHAT_ID || "",
      "",
      "",
      "",
      ""
    ];
  }

  async setBotRunning(running: boolean): Promise<void> {
    this.botRunning = running;
    // Always reset the baseline - either for new start or clean stop
    this.stats.startTime = Date.now();
  }

  async setPaused(paused: boolean): Promise<void> {
    this.paused = paused;
  }

  async isPaused(): Promise<boolean> {
    return this.paused;
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
      isPaused: this.paused,
      totalForwarded: this.stats.totalForwarded,
      totalEdited: this.stats.totalEdited,
      totalDeleted: this.stats.totalDeleted,
      errors: this.stats.errors,
      uptime,
    };
  }

  async incrementForwarded(): Promise<void> {
    this.stats.totalForwarded++;
  }

  async incrementEdited(): Promise<void> {
    this.stats.totalEdited++;
  }

  async incrementDeleted(): Promise<void> {
    this.stats.totalDeleted++;
  }

  async incrementErrors(): Promise<void> {
    this.stats.errors++;
  }

  async setForwardMapping(sourceChatId: string, sourceMessageId: number, forwardedMessages: ForwardedMessage[]): Promise<void> {
    const key = `${sourceChatId}:${sourceMessageId}`;
    this.forwardMap.set(key, forwardedMessages);
  }

  async getForwardMapping(sourceChatId: string, sourceMessageId: number): Promise<ForwardedMessage[] | undefined> {
    const key = `${sourceChatId}:${sourceMessageId}`;
    return this.forwardMap.get(key);
  }

  async deleteForwardMapping(sourceChatId: string, sourceMessageId: number): Promise<void> {
    const key = `${sourceChatId}:${sourceMessageId}`;
    this.forwardMap.delete(key);
  }

  async setTargetChannels(channels: string[]): Promise<void> {
    // Ensure we always have exactly 5 slots
    this.targetChannels = [...channels.slice(0, 5)];
    while (this.targetChannels.length < 5) {
      this.targetChannels.push("");
    }
  }

  async getTargetChannels(): Promise<string[]> {
    return [...this.targetChannels];
  }
}

import { PostgreStorage } from "./postgres-storage";

export const storage = new PostgreStorage();

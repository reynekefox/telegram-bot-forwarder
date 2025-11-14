import { type BotLog, type InsertBotLog, type BotStats, botLogs, forwardMapping, botConfig, botStats as botStatsTable } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { type IStorage } from "./storage";

interface ForwardedMessage {
  chatId: string;
  messageId: number;
}

export class PostgreStorage implements IStorage {
  async addLog(insertLog: InsertBotLog): Promise<BotLog> {
    const [log] = await db.insert(botLogs).values(insertLog).returning();
    return log;
  }

  async getLogs(limit: number = 50): Promise<BotLog[]> {
    return await db.select().from(botLogs).orderBy(desc(botLogs.timestamp)).limit(limit);
  }

  async findLog(sourceChatId: string, sourceMessageId: number, type: string): Promise<BotLog | undefined> {
    const [log] = await db
      .select()
      .from(botLogs)
      .where(
        and(
          eq(botLogs.sourceChatId, sourceChatId),
          eq(botLogs.sourceMessageId, sourceMessageId),
          eq(botLogs.type, type)
        )
      )
      .limit(1);
    return log;
  }

  async getStats(): Promise<BotStats> {
    let stats = await db.select().from(botStatsTable).limit(1);
    
    if (stats.length === 0) {
      const [newStats] = await db.insert(botStatsTable).values({
        totalForwarded: 0,
        totalEdited: 0,
        totalDeleted: 0,
        errors: 0,
        isRunning: false,
        isPaused: false,
        startTime: new Date(),
      }).returning();
      stats = [newStats];
    }

    const record = stats[0];
    const uptime = record.isRunning 
      ? Math.floor((Date.now() - new Date(record.startTime).getTime()) / 1000)
      : 0;

    return {
      isRunning: record.isRunning,
      isPaused: record.isPaused,
      totalForwarded: record.totalForwarded,
      totalEdited: record.totalEdited,
      totalDeleted: record.totalDeleted,
      errors: record.errors,
      uptime,
    };
  }

  async incrementForwarded(): Promise<void> {
    const statsId = await this.ensureStatsExists();
    await db.update(botStatsTable).set({
      totalForwarded: sql`${botStatsTable.totalForwarded} + 1`,
    }).where(eq(botStatsTable.id, statsId));
  }

  async incrementEdited(): Promise<void> {
    const statsId = await this.ensureStatsExists();
    await db.update(botStatsTable).set({
      totalEdited: sql`${botStatsTable.totalEdited} + 1`,
    }).where(eq(botStatsTable.id, statsId));
  }

  async incrementDeleted(): Promise<void> {
    const statsId = await this.ensureStatsExists();
    await db.update(botStatsTable).set({
      totalDeleted: sql`${botStatsTable.totalDeleted} + 1`,
    }).where(eq(botStatsTable.id, statsId));
  }

  async incrementErrors(): Promise<void> {
    const statsId = await this.ensureStatsExists();
    await db.update(botStatsTable).set({
      errors: sql`${botStatsTable.errors} + 1`,
    }).where(eq(botStatsTable.id, statsId));
  }

  async setBotRunning(running: boolean): Promise<void> {
    const statsId = await this.ensureStatsExists();
    await db.update(botStatsTable).set({
      isRunning: running,
      startTime: new Date(),
    }).where(eq(botStatsTable.id, statsId));
  }

  async setPaused(paused: boolean): Promise<void> {
    const statsId = await this.ensureStatsExists();
    await db.update(botStatsTable).set({
      isPaused: paused,
    }).where(eq(botStatsTable.id, statsId));
  }

  async isPaused(): Promise<boolean> {
    const stats = await this.getStats();
    return stats.isPaused;
  }

  async setForwardMapping(sourceChatId: string, sourceMessageId: number, forwardedMessages: ForwardedMessage[]): Promise<void> {
    const existing = await db
      .select()
      .from(forwardMapping)
      .where(
        and(
          eq(forwardMapping.sourceChatId, sourceChatId),
          eq(forwardMapping.sourceMessageId, sourceMessageId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db.update(forwardMapping).set({
        forwardedMessages: forwardedMessages as any,
      }).where(
        and(
          eq(forwardMapping.sourceChatId, sourceChatId),
          eq(forwardMapping.sourceMessageId, sourceMessageId)
        )
      );
    } else {
      await db.insert(forwardMapping).values({
        sourceChatId,
        sourceMessageId,
        forwardedMessages: forwardedMessages as any,
      });
    }
  }

  async getForwardMapping(sourceChatId: string, sourceMessageId: number): Promise<ForwardedMessage[] | undefined> {
    const [result] = await db
      .select()
      .from(forwardMapping)
      .where(
        and(
          eq(forwardMapping.sourceChatId, sourceChatId),
          eq(forwardMapping.sourceMessageId, sourceMessageId)
        )
      )
      .limit(1);

    if (!result) return undefined;

    return result.forwardedMessages as unknown as ForwardedMessage[];
  }

  async deleteForwardMapping(sourceChatId: string, sourceMessageId: number): Promise<void> {
    await db.delete(forwardMapping).where(
      and(
        eq(forwardMapping.sourceChatId, sourceChatId),
        eq(forwardMapping.sourceMessageId, sourceMessageId)
      )
    );
  }

  async setTargetChannels(channels: string[]): Promise<void> {
    const paddedChannels = [...channels.slice(0, 5)];
    while (paddedChannels.length < 5) {
      paddedChannels.push("");
    }

    const existing = await db.select().from(botConfig).where(eq(botConfig.key, "target_channels")).limit(1);

    if (existing.length > 0) {
      await db.update(botConfig).set({
        value: paddedChannels as any,
      }).where(eq(botConfig.key, "target_channels"));
    } else {
      await db.insert(botConfig).values({
        key: "target_channels",
        value: paddedChannels as any,
      });
    }
  }

  async getTargetChannels(): Promise<string[]> {
    const [result] = await db.select().from(botConfig).where(eq(botConfig.key, "target_channels")).limit(1);

    if (!result) {
      const defaultChannels = [
        process.env.TARGET_CHAT_ID || "",
        "",
        "",
        "",
        ""
      ];
      await this.setTargetChannels(defaultChannels);
      return defaultChannels;
    }

    return result.value as unknown as string[];
  }

  private async ensureStatsExists(): Promise<number> {
    const stats = await db.select().from(botStatsTable).limit(1);
    if (stats.length === 0) {
      const [newStats] = await db.insert(botStatsTable).values({
        totalForwarded: 0,
        totalEdited: 0,
        totalDeleted: 0,
        errors: 0,
        isRunning: false,
        isPaused: false,
        startTime: new Date(),
      }).returning();
      return newStats.id;
    }
    return stats[0].id;
  }
}

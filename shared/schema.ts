import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, serial, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botLogs = pgTable("bot_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(),
  sourceChatId: text("source_chat_id").notNull(),
  sourceMessageId: integer("source_message_id").notNull(),
  targetMessageId: integer("target_message_id"),
  status: text("status").notNull(),
  message: text("message"),
  messageText: text("message_text"),
  hasPhoto: boolean("has_photo").default(false),
  photoUrl: text("photo_url"),
});

export const forwardMapping = pgTable("forward_mapping", {
  id: serial("id").primaryKey(),
  sourceChatId: text("source_chat_id").notNull(),
  sourceMessageId: integer("source_message_id").notNull(),
  forwardedMessages: jsonb("forwarded_messages").notNull(),
}, (table) => ({
  uniqueSourceMessage: unique().on(table.sourceChatId, table.sourceMessageId),
}));

export const botConfig = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
});

export const botStats = pgTable("bot_stats", {
  id: serial("id").primaryKey(),
  totalForwarded: integer("total_forwarded").notNull().default(0),
  totalEdited: integer("total_edited").notNull().default(0),
  totalDeleted: integer("total_deleted").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  startTime: timestamp("start_time").notNull().defaultNow(),
  isRunning: boolean("is_running").notNull().default(false),
  isPaused: boolean("is_paused").notNull().default(false),
});

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogs.$inferSelect;

export const botStatsResponseSchema = z.object({
  isRunning: z.boolean(),
  isPaused: z.boolean(),
  totalForwarded: z.number(),
  totalEdited: z.number(),
  totalDeleted: z.number(),
  errors: z.number(),
  uptime: z.number(),
});

export type BotStats = z.infer<typeof botStatsResponseSchema>;

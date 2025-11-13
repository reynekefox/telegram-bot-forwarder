import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
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

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogs.$inferSelect;

export const botStats = z.object({
  isRunning: z.boolean(),
  totalForwarded: z.number(),
  totalEdited: z.number(),
  totalDeleted: z.number(),
  errors: z.number(),
  uptime: z.number(),
});

export type BotStats = z.infer<typeof botStats>;

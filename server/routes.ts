import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startBot, bot, deleteForwardedMessage, SOURCE_CHAT_ID } from "./bot";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get bot statistics
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get activity logs
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get bot configuration
  app.get("/api/config", async (_req, res) => {
    try {
      res.json({
        sourceChatId: process.env.SOURCE_CHAT_ID,
        targetChannels: storage.getTargetChannels(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update target channels
  app.post("/api/config/channels", async (req, res) => {
    try {
      const { channels } = req.body;
      if (!Array.isArray(channels)) {
        return res.status(400).json({ error: "channels must be an array" });
      }
      storage.setTargetChannels(channels);
      res.json({ success: true, channels: storage.getTargetChannels() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Restart bot
  app.post("/api/bot/restart", async (_req, res) => {
    try {
      console.log("Restarting bot via API...");
      // The bot restart will be handled by restarting the workflow
      // For now, just respond with success and let the user restart manually
      res.json({ 
        success: true, 
        message: "Please restart the workflow to apply changes" 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pause bot
  app.post("/api/bot/pause", async (_req, res) => {
    try {
      storage.setPaused(true);
      await storage.addLog({
        type: "info",
        sourceChatId: process.env.SOURCE_CHAT_ID || "",
        sourceMessageId: 0,
        targetMessageId: null,
        status: "success",
        message: "Bot paused - messages will not be forwarded",
      });
      res.json({ success: true, paused: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Resume bot
  app.post("/api/bot/resume", async (_req, res) => {
    try {
      storage.setPaused(false);
      await storage.addLog({
        type: "info",
        sourceChatId: process.env.SOURCE_CHAT_ID || "",
        sourceMessageId: 0,
        targetMessageId: null,
        status: "success",
        message: "Bot resumed - messages will be forwarded",
      });
      res.json({ success: true, paused: false });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete forwarded message from dashboard
  app.post("/api/messages/delete", async (req, res) => {
    try {
      const deleteSchema = z.object({
        sourceChatId: z.string(),
        sourceMessageId: z.union([
          z.number().int().nonnegative(),
          z.string().regex(/^[0-9]+$/).transform(Number)
        ]),
      });

      const parseResult = deleteSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request parameters",
          details: parseResult.error.errors 
        });
      }

      const { sourceChatId, sourceMessageId } = parseResult.data;

      const result = await deleteForwardedMessage(
        bot.telegram,
        sourceChatId,
        sourceMessageId
      );

      if (!result.success) {
        if (result.error === "Message not found in forwarding history") {
          return res.status(404).json({ 
            success: false, 
            error: result.error 
          });
        }
        return res.status(409).json({
          success: false,
          error: result.error,
          successCount: result.successCount,
          totalCount: result.totalCount,
        });
      }

      res.json({
        success: result.success,
        error: result.error,
        successCount: result.successCount,
        totalCount: result.totalCount,
        partialFailure: result.partialFailure,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // Start the Telegram bot in the background (don't block server startup)
  startBot().catch((error) => {
    console.error("Fatal error starting bot:", error);
    process.exit(1);
  });

  return httpServer;
}

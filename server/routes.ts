import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startBot } from "./bot";

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

  const httpServer = createServer(app);

  // Start the Telegram bot in the background (don't block server startup)
  startBot().catch((error) => {
    console.error("Fatal error starting bot:", error);
    process.exit(1);
  });

  return httpServer;
}

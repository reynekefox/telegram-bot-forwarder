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
        targetChatId: process.env.TARGET_CHAT_ID,
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

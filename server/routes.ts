import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCropSchema, insertSeasonSchema, insertTaskSchema,
  insertWorkLogSchema, insertSupplySchema, insertSupplyTransactionSchema,
  insertClimateReadingSchema, insertAlertSchema, insertUserSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/dashboard/stats", async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const user = await storage.createUser(parsed.data);
    res.json(user);
  });

  app.get("/api/crops", async (_req, res) => {
    const crops = await storage.getCrops();
    res.json(crops);
  });

  app.get("/api/crops/:id", async (req, res) => {
    const crop = await storage.getCrop(req.params.id);
    if (!crop) return res.status(404).json({ message: "Crop not found" });
    res.json(crop);
  });

  app.post("/api/crops", async (req, res) => {
    const parsed = insertCropSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const crop = await storage.createCrop(parsed.data);
    res.json(crop);
  });

  app.patch("/api/crops/:id", async (req, res) => {
    const parsed = insertCropSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const crop = await storage.updateCrop(req.params.id, parsed.data);
    if (!crop) return res.status(404).json({ message: "Crop not found" });
    res.json(crop);
  });

  app.delete("/api/crops/:id", async (req, res) => {
    await storage.deleteCrop(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/seasons", async (_req, res) => {
    const seasons = await storage.getSeasons();
    res.json(seasons);
  });

  app.get("/api/seasons/:id", async (req, res) => {
    const season = await storage.getSeason(req.params.id);
    if (!season) return res.status(404).json({ message: "Season not found" });
    res.json(season);
  });

  app.post("/api/seasons", async (req, res) => {
    const parsed = insertSeasonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const season = await storage.createSeason(parsed.data);
    res.json(season);
  });

  app.patch("/api/seasons/:id", async (req, res) => {
    const parsed = insertSeasonSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const season = await storage.updateSeason(req.params.id, parsed.data);
    if (!season) return res.status(404).json({ message: "Season not found" });
    res.json(season);
  });

  app.delete("/api/seasons/:id", async (req, res) => {
    await storage.deleteSeason(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/today", async (_req, res) => {
    const tasks = await storage.getTodayTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/season/:seasonId", async (req, res) => {
    const tasks = await storage.getTasksBySeason(req.params.seasonId);
    res.json(tasks);
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const task = await storage.getTask(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    res.json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const parsed = insertTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.updateTask(req.params.id, parsed.data);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    await storage.deleteTask(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/work-logs", async (_req, res) => {
    const logs = await storage.getWorkLogs();
    res.json(logs);
  });

  app.get("/api/work-logs/season/:seasonId", async (req, res) => {
    const logs = await storage.getWorkLogsBySeason(req.params.seasonId);
    res.json(logs);
  });

  app.post("/api/work-logs", async (req, res) => {
    const parsed = insertWorkLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const log = await storage.createWorkLog(parsed.data);
    res.json(log);
  });

  app.get("/api/supplies", async (_req, res) => {
    const supplies = await storage.getSupplies();
    res.json(supplies);
  });

  app.get("/api/supplies/low-stock", async (_req, res) => {
    const supplies = await storage.getLowStockSupplies();
    res.json(supplies);
  });

  app.get("/api/supplies/:id", async (req, res) => {
    const supply = await storage.getSupply(req.params.id);
    if (!supply) return res.status(404).json({ message: "Supply not found" });
    res.json(supply);
  });

  app.post("/api/supplies", async (req, res) => {
    const parsed = insertSupplySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const supply = await storage.createSupply(parsed.data);
    res.json(supply);
  });

  app.patch("/api/supplies/:id", async (req, res) => {
    const parsed = insertSupplySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const supply = await storage.updateSupply(req.params.id, parsed.data);
    if (!supply) return res.status(404).json({ message: "Supply not found" });
    res.json(supply);
  });

  app.delete("/api/supplies/:id", async (req, res) => {
    await storage.deleteSupply(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/supply-transactions", async (_req, res) => {
    const txs = await storage.getSupplyTransactions();
    res.json(txs);
  });

  app.get("/api/supply-transactions/supply/:supplyId", async (req, res) => {
    const txs = await storage.getTransactionsBySupply(req.params.supplyId);
    res.json(txs);
  });

  app.post("/api/supply-transactions", async (req, res) => {
    const parsed = insertSupplyTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const tx = await storage.createSupplyTransaction(parsed.data);
    res.json(tx);
  });

  app.get("/api/climate", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const readings = await storage.getClimateReadings(limit);
    res.json(readings);
  });

  app.post("/api/climate", async (req, res) => {
    const parsed = insertClimateReadingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const reading = await storage.createClimateReading(parsed.data);
    res.json(reading);
  });

  app.get("/api/alerts", async (_req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.get("/api/alerts/unread", async (_req, res) => {
    const alerts = await storage.getUnreadAlerts();
    res.json(alerts);
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    await storage.markAlertRead(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/alerts/read-all", async (_req, res) => {
    await storage.markAllAlertsRead();
    res.json({ success: true });
  });

  app.post("/api/alerts", async (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const alert = await storage.createAlert(parsed.data);
    res.json(alert);
  });

  return httpServer;
}

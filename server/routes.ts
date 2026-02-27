import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { fetchWeatherData } from "./weather";
import {
  extractUser, requireAuth, requireManager,
  signToken, COOKIE_NAME,
  type AuthPayload,
} from "./auth";
import {
  insertCropSchema, insertSeasonSchema, insertTaskSchema,
  insertWorkLogSchema, insertSupplySchema, insertSupplyTransactionSchema,
  insertClimateReadingSchema, insertAlertSchema, insertUserSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Global middleware ──
  app.use(cookieParser());
  app.use(extractUser);

  // ══════════════════════════════════════════
  // AUTH ROUTES (public)
  // ══════════════════════════════════════════

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const payload: AuthPayload = { id: user.id, username: user.username as string, role: user.role };
    const token = signToken(payload);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
      path: "/",
    });

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
    });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    const user = await storage.getUser(req.user.id);
    if (!user) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      return res.status(401).json({ message: "Người dùng không tồn tại" });
    }
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
    });
  });

  // ══════════════════════════════════════════
  // ALL ROUTES BELOW REQUIRE AUTH
  // ══════════════════════════════════════════

  app.get("/api/dashboard/stats", requireAuth, async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // ── USERS ── (manager only for create)
  app.get("/api/users", requireAuth, async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post("/api/users", requireManager, async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const user = await storage.createUser(parsed.data);
    res.json(user);
  });

  // ── CROPS ── (manager only for CUD)
  app.get("/api/crops", requireAuth, async (_req, res) => {
    const crops = await storage.getCrops();
    res.json(crops);
  });

  app.get("/api/crops/:id", requireAuth, async (req, res) => {
    const crop = await storage.getCrop(req.params.id);
    if (!crop) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(crop);
  });

  app.post("/api/crops", requireManager, async (req, res) => {
    const parsed = insertCropSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const crop = await storage.createCrop(parsed.data);
    res.json(crop);
  });

  app.patch("/api/crops/:id", requireManager, async (req, res) => {
    const parsed = insertCropSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const crop = await storage.updateCrop(req.params.id, parsed.data);
    if (!crop) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(crop);
  });

  app.delete("/api/crops/:id", requireManager, async (req, res) => {
    await storage.deleteCrop(req.params.id);
    res.json({ success: true });
  });

  // ── SEASONS ── (manager only for CUD)
  app.get("/api/seasons", requireAuth, async (_req, res) => {
    const seasons = await storage.getSeasons();
    res.json(seasons);
  });

  app.get("/api/seasons/:id", requireAuth, async (req, res) => {
    const season = await storage.getSeason(req.params.id);
    if (!season) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(season);
  });

  app.post("/api/seasons", requireManager, async (req, res) => {
    const parsed = insertSeasonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const season = await storage.createSeason(parsed.data);
    res.json(season);
  });

  app.patch("/api/seasons/:id", requireManager, async (req, res) => {
    const parsed = insertSeasonSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const season = await storage.updateSeason(req.params.id, parsed.data);
    if (!season) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(season);
  });

  app.delete("/api/seasons/:id", requireManager, async (req, res) => {
    await storage.deleteSeason(req.params.id);
    res.json({ success: true });
  });

  // ── TASKS ── (farmer can update status, manager can create/delete)
  app.get("/api/tasks", requireAuth, async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/today", requireAuth, async (_req, res) => {
    const tasks = await storage.getTodayTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/season/:seasonId", requireAuth, async (req, res) => {
    const tasks = await storage.getTasksBySeason(req.params.seasonId);
    res.json(tasks);
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    const task = await storage.getTask(req.params.id);
    if (!task) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(task);
  });

  app.post("/api/tasks", requireManager, async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    res.json(task);
  });

  // Farmer can update task status; manager can update anything
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    if (req.user!.role === "farmer") {
      // Farmer can only update status
      const allowed = { status: req.body.status };
      if (!allowed.status) {
        return res.status(403).json({ message: "Bạn chỉ có thể cập nhật trạng thái công việc" });
      }
      const task = await storage.updateTask(req.params.id, allowed);
      if (!task) return res.status(404).json({ message: "Không tìm thấy" });
      return res.json(task);
    }
    const parsed = insertTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.updateTask(req.params.id, parsed.data);
    if (!task) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireManager, async (req, res) => {
    await storage.deleteTask(req.params.id);
    res.json({ success: true });
  });

  // ── WORK LOGS ── (both can create)
  app.get("/api/work-logs", requireAuth, async (_req, res) => {
    const logs = await storage.getWorkLogs();
    res.json(logs);
  });

  app.get("/api/work-logs/season/:seasonId", requireAuth, async (req, res) => {
    const logs = await storage.getWorkLogsBySeason(req.params.seasonId);
    res.json(logs);
  });

  app.post("/api/work-logs", requireAuth, async (req, res) => {
    const parsed = insertWorkLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const log = await storage.createWorkLog(parsed.data);
    res.json(log);
  });

  // ── SUPPLIES ── (manager only for CUD)
  app.get("/api/supplies", requireAuth, async (_req, res) => {
    const supplies = await storage.getSupplies();
    res.json(supplies);
  });

  app.get("/api/supplies/low-stock", requireAuth, async (_req, res) => {
    const supplies = await storage.getLowStockSupplies();
    res.json(supplies);
  });

  app.get("/api/supplies/:id", requireAuth, async (req, res) => {
    const supply = await storage.getSupply(req.params.id);
    if (!supply) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(supply);
  });

  app.post("/api/supplies", requireManager, async (req, res) => {
    const parsed = insertSupplySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const supply = await storage.createSupply(parsed.data);
    res.json(supply);
  });

  app.patch("/api/supplies/:id", requireManager, async (req, res) => {
    const parsed = insertSupplySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const supply = await storage.updateSupply(req.params.id, parsed.data);
    if (!supply) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(supply);
  });

  app.delete("/api/supplies/:id", requireManager, async (req, res) => {
    await storage.deleteSupply(req.params.id);
    res.json({ success: true });
  });

  // ── SUPPLY TRANSACTIONS ── (manager only)
  app.get("/api/supply-transactions", requireAuth, async (_req, res) => {
    const txs = await storage.getSupplyTransactions();
    res.json(txs);
  });

  app.get("/api/supply-transactions/supply/:supplyId", requireAuth, async (req, res) => {
    const txs = await storage.getTransactionsBySupply(req.params.supplyId);
    res.json(txs);
  });

  app.post("/api/supply-transactions", requireManager, async (req, res) => {
    const parsed = insertSupplyTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const tx = await storage.createSupplyTransaction(parsed.data);
    res.json(tx);
  });

  // ── WEATHER / CLIMATE ──
  app.get("/api/weather", requireAuth, async (_req, res) => {
    try {
      const weather = await fetchWeatherData();

      const existingReadings = await storage.getClimateReadings(200);
      const existingTimes = new Set(
        existingReadings.map(r => r.recordedAt ? new Date(r.recordedAt).toISOString() : "")
      );

      let newCount = 0;
      for (const reading of weather.hourly) {
        const readingTime = new Date(reading.recordedAt).toISOString();
        if (!existingTimes.has(readingTime)) {
          await storage.createClimateReading({
            temperature: reading.temperature,
            humidity: reading.humidity,
            rainfall: reading.rainfall,
            lightIntensity: reading.lightIntensity,
            soilMoisture: reading.soilMoisture,
            soilPh: reading.soilPh ? Math.round(reading.soilPh * 10) / 10 : null,
            windSpeed: reading.windSpeed,
            location: "Hà Nội",
          });
          newCount++;
        }
      }

      if (newCount > 0) console.log(`Synced ${newCount} weather readings to database`);

      const current = weather.current;
      if (current.temperature != null && current.temperature > 38) {
        await storage.createAlert({ type: "weather", severity: "warning", title: "Cảnh báo nắng nóng", message: `Nhiệt độ hiện tại ${current.temperature}°C` });
      }
      if (current.rainfall != null && current.rainfall > 20) {
        await storage.createAlert({ type: "weather", severity: "critical", title: "Cảnh báo mưa lớn", message: `Lượng mưa ${current.rainfall}mm/h` });
      }

      res.json(weather);
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ message: "Không thể lấy dữ liệu thời tiết" });
    }
  });

  app.get("/api/climate", requireAuth, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const readings = await storage.getClimateReadings(limit);
    res.json(readings);
  });

  app.post("/api/climate", requireManager, async (req, res) => {
    const parsed = insertClimateReadingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const reading = await storage.createClimateReading(parsed.data);
    res.json(reading);
  });

  // ── ALERTS ──
  app.get("/api/alerts", requireAuth, async (_req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.get("/api/alerts/unread", requireAuth, async (_req, res) => {
    const alerts = await storage.getUnreadAlerts();
    res.json(alerts);
  });

  app.patch("/api/alerts/:id/read", requireAuth, async (req, res) => {
    await storage.markAlertRead(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/alerts/read-all", requireAuth, async (_req, res) => {
    await storage.markAllAlertsRead();
    res.json({ success: true });
  });

  app.post("/api/alerts", requireManager, async (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const alert = await storage.createAlert(parsed.data);
    res.json(alert);
  });

  return httpServer;
}

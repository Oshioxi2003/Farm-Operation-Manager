import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import express from "express";
import crypto from "crypto";
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
  workLogs, notifications, supplyTransactions,
} from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Global middleware ──
  app.use(cookieParser());
  app.use(extractUser);

  // ── Helper: check & notify overdue tasks ──
  async function checkOverdueTasks() {
    try {
      const allTasks = await storage.getTasks();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const task of allTasks) {
        // Skip tasks already done or already marked overdue
        if (task.status === "done" || task.status === "overdue") continue;
        if (!task.dueDate) continue;

        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);

        if (due < today) {
          // Mark task as overdue
          await storage.updateTask(task.id, { status: "overdue" } as any);

          // Send notification to assigned user (if any and not already notified)
          if (task.assigneeId) {
            // Check if a notification for this overdue task was already sent
            const existingNotifs = await storage.getNotifications(task.assigneeId);
            const alreadyNotified = existingNotifs.some(
              n => n.relatedId === task.id && n.title === "Công việc quá hạn"
            );

            if (!alreadyNotified) {
              await storage.createNotification({
                targetUserId: task.assigneeId,
                title: "Công việc quá hạn",
                message: `Công việc "${task.title}" đã quá hạn (hạn: ${String(task.dueDate).split("T")[0]})`,
                isRead: false,
                relatedId: task.id,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking overdue tasks:", error);
    }
  }

  // ── Serve uploaded media files ──
  const mediaDir = path.resolve(process.cwd(), "media");
  app.use("/media", express.static(mediaDir));

  // ── Upload endpoint for crop images ──
  app.post("/api/upload/crops", requireManager, async (req, res) => {
    try {
      const { base64, filename } = req.body;
      if (!base64) return res.status(400).json({ message: "Thiếu dữ liệu ảnh" });

      // Extract data from base64 string (handle data:image/xxx;base64,...)
      const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
      let ext = "png";
      let data = base64;
      if (matches) {
        ext = matches[1];
        data = matches[2];
      }

      const uploadDir = path.resolve(process.cwd(), "media", "upload", "crops");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeName = filename
        ? filename.replace(/[^a-zA-Z0-9._-]/g, "_")
        : `${crypto.randomUUID()}.${ext}`;
      const filePath = path.join(uploadDir, safeName);

      fs.writeFileSync(filePath, Buffer.from(data, "base64"));

      const url = `/media/upload/crops/${safeName}`;
      res.json({ url });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Lỗi tải ảnh lên" });
    }
  });

  // ── Upload endpoint for work-log images ──
  app.post("/api/upload/work-logs", requireAuth, async (req, res) => {
    try {
      const { base64, filename } = req.body;
      if (!base64) return res.status(400).json({ message: "Thiếu dữ liệu ảnh" });

      const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
      let ext = "png";
      let data = base64;
      if (matches) {
        ext = matches[1];
        data = matches[2];
      }

      const uploadDir = path.resolve(process.cwd(), "media", "upload", "work-logs");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeName = filename
        ? filename.replace(/[^a-zA-Z0-9._-]/g, "_")
        : `${crypto.randomUUID()}.${ext}`;
      const filePath = path.join(uploadDir, safeName);

      fs.writeFileSync(filePath, Buffer.from(data, "base64"));

      const url = `/media/upload/work-logs/${safeName}`;
      res.json({ url });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Lỗi tải ảnh lên" });
    }
  });

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

    // Check if user is locked
    if (user.isLocked) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." });
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
    if (user.isLocked) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
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
    // Check for overdue tasks on dashboard access
    await checkOverdueTasks();
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // ── USERS ── (manager only for create/update)
  app.get("/api/users", requireAuth, async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/:id", requireManager, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    const { password, ...safeUser } = user as any;
    res.json(safeUser);
  });

  app.post("/api/users", requireManager, async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const user = await storage.createUser(parsed.data);
    res.json(user);
  });

  app.patch("/api/users/:id", requireManager, async (req, res) => {
    const { password, isLocked } = req.body;
    const updateData: Record<string, unknown> = {};
    if (password !== undefined) updateData.password = password;
    if (isLocked !== undefined) updateData.isLocked = isLocked;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu cập nhật" });
    }
    const user = await storage.updateUser(req.params.id, updateData as any);
    if (!user) return res.status(404).json({ message: "Không tìm thấy" });
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
    // Check if any seasons reference this crop
    const allSeasons = await storage.getSeasons();
    const linkedSeasons = allSeasons.filter(s => s.cropId === req.params.id);
    if (linkedSeasons.length > 0) {
      const names = linkedSeasons.map(s => s.name).join(", ");
      return res.status(400).json({
        message: `Không thể xóa cây trồng vì đang được sử dụng trong mùa vụ: ${names}. Vui lòng xóa các mùa vụ liên quan trước.`,
      });
    }
    await storage.deleteCrop(req.params.id);
    res.json({ success: true });
  });

  // ── SEASONS ── (manager only for CUD)
  app.get("/api/seasons", requireAuth, async (_req, res) => {
    const seasons = await storage.getSeasons();
    res.json(seasons);
  });

  app.get("/api/seasons/active", requireAuth, async (_req, res) => {
    const allSeasons = await storage.getSeasons();
    const active = allSeasons.filter(s => s.status === "active");
    res.json(active);
  });

  app.get("/api/seasons/:id", requireAuth, async (req, res) => {
    const season = await storage.getSeason(req.params.id);
    if (!season) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(season);
  });

  app.post("/api/seasons", requireManager, async (req, res) => {
    const body = { ...req.body };
    if (body.startDate && typeof body.startDate === "string") body.startDate = new Date(body.startDate);
    if (body.endDate && typeof body.endDate === "string") body.endDate = new Date(body.endDate);
    const parsed = insertSeasonSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const season = await storage.createSeason(parsed.data);
    res.json(season);
  });

  app.post("/api/seasons/:id/copy", requireManager, async (req, res) => {
    try {
      const season = await storage.copySeason(req.params.id);
      res.json(season);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Không tìm thấy mùa vụ" });
    }
  });

  // Farmer can advance stage (update currentStage, progress, status); manager can update everything
  app.patch("/api/seasons/:id", requireAuth, async (req, res) => {
    if (req.user!.role === "farmer") {
      // Farmer can only update stage-related fields
      const allowed: Record<string, unknown> = {};
      if (req.body.currentStage) allowed.currentStage = req.body.currentStage;
      if (req.body.progress !== undefined) allowed.progress = req.body.progress;
      if (req.body.status) allowed.status = req.body.status;
      if (Object.keys(allowed).length === 0) {
        return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
      }
      const season = await storage.updateSeason(req.params.id, allowed as any);
      if (!season) return res.status(404).json({ message: "Không tìm thấy" });
      return res.json(season);
    }

    const body = { ...req.body };
    if (body.startDate && typeof body.startDate === "string") body.startDate = new Date(body.startDate);
    if (body.endDate && typeof body.endDate === "string") body.endDate = new Date(body.endDate);
    const parsed = insertSeasonSchema.partial().safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const season = await storage.updateSeason(req.params.id, parsed.data);
    if (!season) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(season);
  });

  app.delete("/api/seasons/:id", requireManager, async (req, res) => {
    const season = await storage.getSeason(req.params.id);
    if (!season) return res.status(404).json({ message: "Không tìm thấy mùa vụ" });

    // Only allow delete if season hasn't started
    if (season.status !== "planning") {
      return res.status(403).json({ message: "Chỉ có thể xóa mùa vụ ở trạng thái 'Kế hoạch'" });
    }
    if (season.progress && season.progress > 0) {
      return res.status(403).json({ message: "Không thể xóa mùa vụ đã có tiến độ" });
    }

    // Check if any tasks have been started (not todo)
    const seasonTasks = await storage.getTasksBySeason(req.params.id);
    const activeTasks = seasonTasks.filter(t => t.status !== "todo");
    if (activeTasks.length > 0) {
      return res.status(403).json({ message: "Không thể xóa mùa vụ đã có công việc đang thực hiện" });
    }

    // Delete work logs referencing this season first (FK constraint)
    await db.delete(workLogs).where(eq(workLogs.seasonId, req.params.id as string));

    // Delete all associated todo tasks first
    for (const task of seasonTasks) {
      await storage.deleteTask(task.id);
    }

    await storage.deleteSeason(req.params.id);
    res.json({ success: true });
  });

  // ── TASKS ── (farmer can update status, manager can create/delete)
  app.get("/api/tasks", requireAuth, async (req, res) => {
    // Check for overdue tasks on task list access
    await checkOverdueTasks();
    const tasks = await storage.getTasks();
    // Farmer only sees their own assigned tasks
    if (req.user!.role === "farmer") {
      const myTasks = tasks.filter(t => t.assigneeId === req.user!.id);
      return res.json(myTasks);
    }
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
    const body = { ...req.body };
    if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
    const parsed = insertTaskSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);

    // Send notification to assigned farmer
    if (parsed.data.assigneeId) {
      const assignee = await storage.getUser(parsed.data.assigneeId);
      if (assignee) {
        await storage.createNotification({
          targetUserId: parsed.data.assigneeId,
          title: "Công việc mới được giao",
          message: `Bạn được giao công việc: "${parsed.data.title}"`,
          isRead: false,
          relatedId: task.id,
        });
      }
    }

    res.json(task);
  });

  // Farmer can update task status; manager can update anything (except mark done)
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    const existingTask = await storage.getTask(req.params.id);
    if (!existingTask) return res.status(404).json({ message: "Không tìm thấy" });

    if (req.user!.role === "farmer") {
      // Farmer can update status, proofImage, and harvestYield
      const allowed: Record<string, unknown> = {};
      if (req.body.status) allowed.status = req.body.status;
      if (req.body.proofImage !== undefined) allowed.proofImage = req.body.proofImage;
      if (req.body.harvestYield !== undefined) allowed.harvestYield = req.body.harvestYield;
      if (req.body.status === "done") {
        allowed.completedAt = new Date();
      }
      if (Object.keys(allowed).length === 0) {
        return res.status(403).json({ message: "Bạn chỉ có thể cập nhật trạng thái công việc" });
      }
      const task = await storage.updateTask(req.params.id, allowed as any);

      // Auto-recalculate season progress based on completed tasks
      if (allowed.status === "done" && existingTask.seasonId) {
        const seasonTasks = await storage.getTasksBySeason(existingTask.seasonId);
        const totalTasks = seasonTasks.length;
        const doneTasks = seasonTasks.filter(t => t.status === "done").length;
        const newProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        await storage.updateSeason(existingTask.seasonId, { progress: newProgress } as any);
      }

      return res.json(task);
    }

    // Manager: cannot mark task as "done"
    if (req.body.status === "done") {
      return res.status(403).json({ message: "Chỉ nông dân mới có thể hoàn thành công việc" });
    }

    // Manager: can only edit tasks with status "todo"
    if (existingTask.status !== "todo" && !req.body.status) {
      return res.status(403).json({ message: "Chỉ có thể chỉnh sửa công việc ở trạng thái 'Chờ làm'" });
    }

    const body = { ...req.body };
    if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
    const parsed = insertTaskSchema.partial().safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    // If assignee changed, send notification
    if (parsed.data.assigneeId && parsed.data.assigneeId !== existingTask.assigneeId) {
      const assignee = await storage.getUser(parsed.data.assigneeId);
      if (assignee) {
        await storage.createNotification({
          targetUserId: parsed.data.assigneeId,
          title: "Công việc mới được giao",
          message: `Bạn được giao công việc: "${existingTask.title}"`,
          isRead: false,
          relatedId: existingTask.id,
        });
      }
    }

    const task = await storage.updateTask(req.params.id, parsed.data);
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireManager, async (req, res) => {
    const task = await storage.getTask(req.params.id);
    if (!task) return res.status(404).json({ message: "Không tìm thấy" });
    if (task.status !== "todo") {
      return res.status(403).json({ message: "Chỉ có thể xóa công việc ở trạng thái 'Chờ làm'" });
    }
    await storage.deleteTask(req.params.id);
    res.json({ success: true });
  });

  // ── WORK LOGS ── (both can create)
  app.get("/api/work-logs", requireAuth, async (req, res) => {
    const logs = await storage.getWorkLogs();
    // Farmer only sees their own work logs
    if (req.user!.role === "farmer") {
      const myLogs = logs.filter(l => l.userId === req.user!.id);
      return res.json(myLogs);
    }
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
    try {
      // Delete related supply_transactions first (FK constraint)
      await db.delete(supplyTransactions).where(eq(supplyTransactions.supplyId, req.params.id as string));
      // Clear supplyId from work_logs referencing this supply
      await db.update(workLogs).set({ supplyId: null }).where(eq(workLogs.supplyId, req.params.id as string));
      await storage.deleteSupply(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Không thể xóa vật tư" });
    }
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

  app.post("/api/supply-transactions", requireAuth, async (req, res) => {
    const parsed = insertSupplyTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    // Farmer can only create export (usage) transactions
    if (req.user!.role === "farmer" && parsed.data.type !== "export") {
      return res.status(403).json({ message: "Nông dân chỉ có thể sử dụng (xuất) vật tư" });
    }

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

  // ── NOTIFICATIONS ──
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getNotifications(req.user!.id);
    res.json(notifs);
  });

  app.get("/api/notifications/unread", requireAuth, async (req, res) => {
    const notifs = await storage.getUnreadNotifications(req.user!.id);
    res.json(notifs);
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.user!.id);
    res.json({ success: true });
  });

  return httpServer;
}

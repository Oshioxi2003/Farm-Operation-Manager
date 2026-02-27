import { eq, desc, and, lte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, crops, seasons, tasks, workLogs, supplies, supplyTransactions, climateReadings, alerts,
  type User, type InsertUser,
  type Crop, type InsertCrop,
  type Season, type InsertSeason,
  type Task, type InsertTask,
  type WorkLog, type InsertWorkLog,
  type Supply, type InsertSupply,
  type SupplyTransaction, type InsertSupplyTransaction,
  type ClimateReading, type InsertClimateReading,
  type Alert, type InsertAlert,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  getCrops(): Promise<Crop[]>;
  getCrop(id: string): Promise<Crop | undefined>;
  createCrop(crop: InsertCrop): Promise<Crop>;
  updateCrop(id: string, crop: Partial<InsertCrop>): Promise<Crop | undefined>;
  deleteCrop(id: string): Promise<void>;

  getSeasons(): Promise<Season[]>;
  getSeason(id: string): Promise<Season | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: string, season: Partial<InsertSeason>): Promise<Season | undefined>;
  deleteSeason(id: string): Promise<void>;

  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksBySeason(seasonId: string): Promise<Task[]>;
  getTasksByAssignee(assigneeId: string): Promise<Task[]>;
  getTodayTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  getWorkLogs(): Promise<WorkLog[]>;
  getWorkLogsBySeason(seasonId: string): Promise<WorkLog[]>;
  createWorkLog(log: InsertWorkLog): Promise<WorkLog>;

  getSupplies(): Promise<Supply[]>;
  getSupply(id: string): Promise<Supply | undefined>;
  createSupply(supply: InsertSupply): Promise<Supply>;
  updateSupply(id: string, supply: Partial<InsertSupply>): Promise<Supply | undefined>;
  deleteSupply(id: string): Promise<void>;
  getLowStockSupplies(): Promise<Supply[]>;

  getSupplyTransactions(): Promise<SupplyTransaction[]>;
  getTransactionsBySupply(supplyId: string): Promise<SupplyTransaction[]>;
  createSupplyTransaction(tx: InsertSupplyTransaction): Promise<SupplyTransaction>;

  getClimateReadings(limit?: number): Promise<ClimateReading[]>;
  createClimateReading(reading: InsertClimateReading): Promise<ClimateReading>;

  getAlerts(): Promise<Alert[]>;
  getUnreadAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: string): Promise<void>;
  markAllAlertsRead(): Promise<void>;

  getDashboardStats(): Promise<{
    activeSeasons: number;
    todayTasks: number;
    lowStockCount: number;
    unreadAlerts: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUsers() {
    return db.select().from(users);
  }

  async getCrops() {
    return db.select().from(crops);
  }

  async getCrop(id: string) {
    const [crop] = await db.select().from(crops).where(eq(crops.id, id));
    return crop;
  }

  async createCrop(crop: InsertCrop) {
    const [created] = await db.insert(crops).values(crop).returning();
    return created;
  }

  async updateCrop(id: string, crop: Partial<InsertCrop>) {
    const [updated] = await db.update(crops).set(crop).where(eq(crops.id, id)).returning();
    return updated;
  }

  async deleteCrop(id: string) {
    await db.delete(crops).where(eq(crops.id, id));
  }

  async getSeasons() {
    return db.select().from(seasons).orderBy(desc(seasons.startDate));
  }

  async getSeason(id: string) {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id));
    return season;
  }

  async createSeason(season: InsertSeason) {
    const [created] = await db.insert(seasons).values(season).returning();
    return created;
  }

  async updateSeason(id: string, season: Partial<InsertSeason>) {
    const [updated] = await db.update(seasons).set(season).where(eq(seasons.id, id)).returning();
    return updated;
  }

  async deleteSeason(id: string) {
    await db.delete(seasons).where(eq(seasons.id, id));
  }

  async getTasks() {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksBySeason(seasonId: string) {
    return db.select().from(tasks).where(eq(tasks.seasonId, seasonId));
  }

  async getTasksByAssignee(assigneeId: string) {
    return db.select().from(tasks).where(eq(tasks.assigneeId, assigneeId));
  }

  async getTodayTasks() {
    const today = new Date().toISOString().split("T")[0];
    return db.select().from(tasks).where(
      and(
        lte(tasks.dueDate, today),
        sql`${tasks.status} != 'done'`
      )
    );
  }

  async createTask(task: InsertTask) {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, task: Partial<InsertTask>) {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: string) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getWorkLogs() {
    return db.select().from(workLogs).orderBy(desc(workLogs.createdAt));
  }

  async getWorkLogsBySeason(seasonId: string) {
    return db.select().from(workLogs).where(eq(workLogs.seasonId, seasonId));
  }

  async createWorkLog(log: InsertWorkLog) {
    const [created] = await db.insert(workLogs).values(log).returning();
    return created;
  }

  async getSupplies() {
    return db.select().from(supplies);
  }

  async getSupply(id: string) {
    const [supply] = await db.select().from(supplies).where(eq(supplies.id, id));
    return supply;
  }

  async createSupply(supply: InsertSupply) {
    const [created] = await db.insert(supplies).values(supply).returning();
    return created;
  }

  async updateSupply(id: string, supply: Partial<InsertSupply>) {
    const [updated] = await db.update(supplies).set(supply).where(eq(supplies.id, id)).returning();
    return updated;
  }

  async deleteSupply(id: string) {
    await db.delete(supplies).where(eq(supplies.id, id));
  }

  async getLowStockSupplies() {
    return db.select().from(supplies).where(
      sql`${supplies.currentStock} <= ${supplies.minThreshold}`
    );
  }

  async getSupplyTransactions() {
    return db.select().from(supplyTransactions).orderBy(desc(supplyTransactions.createdAt));
  }

  async getTransactionsBySupply(supplyId: string) {
    return db.select().from(supplyTransactions).where(eq(supplyTransactions.supplyId, supplyId));
  }

  async createSupplyTransaction(tx: InsertSupplyTransaction) {
    const [created] = await db.insert(supplyTransactions).values(tx).returning();
    const supply = await this.getSupply(tx.supplyId!);
    if (supply) {
      const newStock = tx.type === "import"
        ? supply.currentStock + tx.quantity
        : supply.currentStock - tx.quantity;
      const status = newStock <= 0 ? "out" : newStock <= (supply.minThreshold || 0) ? "low" : "ok";
      await this.updateSupply(supply.id, { currentStock: newStock, status } as any);
    }
    return created;
  }

  async getClimateReadings(limit = 100) {
    return db.select().from(climateReadings).orderBy(desc(climateReadings.recordedAt)).limit(limit);
  }

  async createClimateReading(reading: InsertClimateReading) {
    const [created] = await db.insert(climateReadings).values(reading).returning();
    return created;
  }

  async getAlerts() {
    return db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getUnreadAlerts() {
    return db.select().from(alerts).where(eq(alerts.isRead, false)).orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert) {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }

  async markAlertRead(id: string) {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  async markAllAlertsRead() {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.isRead, false));
  }

  async getDashboardStats() {
    const [activeSeasonsResult] = await db.select({ count: sql<number>`count(*)` }).from(seasons).where(eq(seasons.status, "active"));
    const todayTasksList = await this.getTodayTasks();
    const lowStockList = await this.getLowStockSupplies();
    const unreadAlertsList = await this.getUnreadAlerts();

    return {
      activeSeasons: Number(activeSeasonsResult.count),
      todayTasks: todayTasksList.length,
      lowStockCount: lowStockList.length,
      unreadAlerts: unreadAlertsList.length,
    };
  }
}

export const storage = new DatabaseStorage();

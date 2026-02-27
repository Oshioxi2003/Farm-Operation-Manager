import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, int, timestamp, date, float, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: mysqlEnum("role", ["manager", "farmer"]).notNull().default("farmer"),
  phone: text("phone"),
  avatar: text("avatar"),
});

export const crops = mysqlTable("crops", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  variety: text("variety"),
  description: text("description"),
  growthDuration: int("growth_duration"),
  optimalTemp: text("optimal_temp"),
  optimalHumidity: text("optimal_humidity"),
  optimalPh: text("optimal_ph"),
  careInstructions: text("care_instructions"),
  image: text("image"),
});

export const seasons = mysqlTable("seasons", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  cropId: varchar("crop_id", { length: 36 }).references(() => crops.id),
  status: mysqlEnum("status", ["planning", "active", "completed"]).notNull().default("planning"),
  currentStage: mysqlEnum("current_stage", ["planting", "caring", "harvesting"]).default("planting"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  area: float("area"),
  areaUnit: text("area_unit").default("ha"),
  notes: text("notes"),
  progress: int("progress").default(0),
});

export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  title: text("title").notNull(),
  description: text("description"),
  seasonId: varchar("season_id", { length: 36 }).references(() => seasons.id),
  assigneeId: varchar("assignee_id", { length: 36 }).references(() => users.id),
  status: mysqlEnum("status", ["todo", "doing", "done", "overdue"]).notNull().default("todo"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium"),
  stage: mysqlEnum("stage", ["planting", "caring", "harvesting"]),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workLogs = mysqlTable("work_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  taskId: varchar("task_id", { length: 36 }).references(() => tasks.id),
  seasonId: varchar("season_id", { length: 36 }).references(() => seasons.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  content: text("content").notNull(),
  hoursWorked: float("hours_worked"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supplies = mysqlTable("supplies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull(),
  currentStock: float("current_stock").notNull().default(0),
  minThreshold: float("min_threshold").default(0),
  status: mysqlEnum("status", ["ok", "low", "out"]).default("ok"),
});

export const supplyTransactions = mysqlTable("supply_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  supplyId: varchar("supply_id", { length: 36 }).references(() => supplies.id),
  seasonId: varchar("season_id", { length: 36 }).references(() => seasons.id),
  type: text("type").notNull(),
  quantity: float("quantity").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const climateReadings = mysqlTable("climate_readings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  temperature: float("temperature"),
  humidity: float("humidity"),
  rainfall: float("rainfall"),
  lightIntensity: float("light_intensity"),
  soilMoisture: float("soil_moisture"),
  soilPh: float("soil_ph"),
  windSpeed: float("wind_speed"),
  location: varchar("location", { length: 100 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const alerts = mysqlTable("alerts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  type: mysqlEnum("type", ["low_stock", "overdue_task", "weather", "stage_change"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: varchar("related_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCropSchema = createInsertSchema(crops).omit({ id: true });
export const insertSeasonSchema = createInsertSchema(seasons).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertWorkLogSchema = createInsertSchema(workLogs).omit({ id: true, createdAt: true });
export const insertSupplySchema = createInsertSchema(supplies).omit({ id: true });
export const insertSupplyTransactionSchema = createInsertSchema(supplyTransactions).omit({ id: true, createdAt: true });
export const insertClimateReadingSchema = createInsertSchema(climateReadings).omit({ id: true, recordedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCrop = z.infer<typeof insertCropSchema>;
export type Crop = typeof crops.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasons.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
export type WorkLog = typeof workLogs.$inferSelect;
export type InsertSupply = z.infer<typeof insertSupplySchema>;
export type Supply = typeof supplies.$inferSelect;
export type InsertSupplyTransaction = z.infer<typeof insertSupplyTransactionSchema>;
export type SupplyTransaction = typeof supplyTransactions.$inferSelect;
export type InsertClimateReading = z.infer<typeof insertClimateReadingSchema>;
export type ClimateReading = typeof climateReadings.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

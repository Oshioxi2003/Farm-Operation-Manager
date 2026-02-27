import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, date, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["manager", "farmer"]);
export const seasonStatusEnum = pgEnum("season_status", ["planning", "active", "completed"]);
export const stageEnum = pgEnum("stage", ["planting", "caring", "harvesting"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "doing", "done", "overdue"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const stockStatusEnum = pgEnum("stock_status", ["ok", "low", "out"]);
export const alertTypeEnum = pgEnum("alert_type", ["low_stock", "overdue_task", "weather", "stage_change"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("farmer"),
  phone: text("phone"),
  avatar: text("avatar"),
});

export const crops = pgTable("crops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  variety: text("variety"),
  description: text("description"),
  growthDuration: integer("growth_duration"),
  optimalTemp: text("optimal_temp"),
  optimalHumidity: text("optimal_humidity"),
  optimalPh: text("optimal_ph"),
  careInstructions: text("care_instructions"),
  image: text("image"),
});

export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cropId: varchar("crop_id").references(() => crops.id),
  status: seasonStatusEnum("status").notNull().default("planning"),
  currentStage: stageEnum("current_stage").default("planting"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  area: real("area"),
  areaUnit: text("area_unit").default("ha"),
  notes: text("notes"),
  progress: integer("progress").default(0),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  seasonId: varchar("season_id").references(() => seasons.id),
  assigneeId: varchar("assignee_id").references(() => users.id),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").default("medium"),
  stage: stageEnum("stage"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workLogs = pgTable("work_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id),
  seasonId: varchar("season_id").references(() => seasons.id),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  hoursWorked: real("hours_worked"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supplies = pgTable("supplies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull(),
  currentStock: real("current_stock").notNull().default(0),
  minThreshold: real("min_threshold").default(0),
  status: stockStatusEnum("status").default("ok"),
});

export const supplyTransactions = pgTable("supply_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplyId: varchar("supply_id").references(() => supplies.id),
  seasonId: varchar("season_id").references(() => seasons.id),
  type: text("type").notNull(),
  quantity: real("quantity").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const climateReadings = pgTable("climate_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  temperature: real("temperature"),
  humidity: real("humidity"),
  rainfall: real("rainfall"),
  lightIntensity: real("light_intensity"),
  soilMoisture: real("soil_moisture"),
  soilPh: real("soil_ph"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: alertTypeEnum("type").notNull(),
  severity: alertSeverityEnum("severity").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: varchar("related_id"),
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

import { db } from "./db";
import { users, crops, seasons, tasks, supplies, supplyTransactions, climateReadings, alerts } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) return;

  await db.insert(users).values([
    { username: "admin", password: "admin123", fullName: "Nguyen Van Minh", role: "manager", phone: "0901234567" },
    { username: "farmer1", password: "farmer123", fullName: "Tran Thi Lan", role: "farmer", phone: "0912345678" },
    { username: "farmer2", password: "farmer123", fullName: "Le Van Hung", role: "farmer", phone: "0923456789" },
    { username: "farmer3", password: "farmer123", fullName: "Pham Thi Mai", role: "farmer", phone: "0934567890" },
  ]);

  await db.insert(crops).values([
    {
      name: "Lua nuoc",
      variety: "IR50404",
      description: "Giong lua nang suat cao, thich hop vung dong bang",
      growthDuration: 120,
      optimalTemp: "25-32",
      optimalHumidity: "70-85",
      optimalPh: "5.5-7.0",
      careInstructions: "Tuoi nuoc deu, bon phan 3 dot: lot, thuc 1, thuc 2. Phun thuoc phong tru sau benh dinh ky.",
    },
    {
      name: "Ca phao",
      variety: "Ca phao trang",
      description: "Giong ca phao truyen thong, de trong, nang suat on dinh",
      growthDuration: 75,
      optimalTemp: "22-30",
      optimalHumidity: "60-80",
      optimalPh: "6.0-6.8",
      careInstructions: "Trong hang cach hang 50cm, cay cach cay 40cm. Tuoi nuoc 2 lan/ngay.",
    },
    {
      name: "Rau cai",
      variety: "Cai ngot",
      description: "Rau ngan ngay, thu hoach nhanh, nhu cau tieu thu cao",
      growthDuration: 35,
      optimalTemp: "18-25",
      optimalHumidity: "65-80",
      optimalPh: "6.0-7.0",
      careInstructions: "Gieo hat truc tiep hoac cay con. Tuoi nuoc sang chieu. Bon phan dam dinh ky.",
    },
    {
      name: "Dau phong",
      variety: "L14",
      description: "Giong dau phong chiu han tot, thich hop dat cat pha",
      growthDuration: 100,
      optimalTemp: "25-30",
      optimalHumidity: "60-70",
      optimalPh: "5.5-6.5",
      careInstructions: "Lam dat ky, be luong. Trong khoang cach 30x15cm. Vun goc khi cay ra hoa.",
    },
  ]);

  // Query back inserted data (MySQL doesn't support .returning())
  const allFarmers = await db.select().from(users);
  const farmer1 = allFarmers.find(u => u.username === "farmer1")!;
  const farmer2 = allFarmers.find(u => u.username === "farmer2")!;
  const farmer3 = allFarmers.find(u => u.username === "farmer3")!;

  const allCrops = await db.select().from(crops);
  const lua = allCrops.find(c => c.name === "Lua nuoc")!;
  const caPhao = allCrops.find(c => c.name === "Ca phao")!;
  const rauCai = allCrops.find(c => c.name === "Rau cai")!;

  await db.insert(seasons).values([
    {
      name: "Vu Dong Xuan 2025-2026",
      cropId: lua.id,
      status: "active",
      currentStage: "caring",
      startDate: "2025-11-15",
      endDate: "2026-03-15",
      area: 5.5,
      areaUnit: "ha",
      notes: "Mua vu chinh, du kien nang suat cao",
      progress: 55,
    },
    {
      name: "Vu Xuan He 2026",
      cropId: caPhao.id,
      status: "active",
      currentStage: "planting",
      startDate: "2026-02-01",
      endDate: "2026-05-15",
      area: 1.2,
      areaUnit: "ha",
      notes: "Trong xen canh voi dau phong",
      progress: 15,
    },
    {
      name: "Vu Rau quy 1/2026",
      cropId: rauCai.id,
      status: "active",
      currentStage: "harvesting",
      startDate: "2026-01-10",
      endDate: "2026-02-20",
      area: 0.3,
      areaUnit: "ha",
      notes: "Thu hoach cuon chieu, ban cho dau moi",
      progress: 85,
    },
  ]);

  const allSeasons = await db.select().from(seasons);
  const season1 = allSeasons.find(s => s.name === "Vu Dong Xuan 2025-2026")!;
  const season2 = allSeasons.find(s => s.name === "Vu Xuan He 2026")!;
  const season3 = allSeasons.find(s => s.name === "Vu Rau quy 1/2026")!;

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

  await db.insert(tasks).values([
    { title: "Bon phan thuc lan 2", description: "Bon phan ure 15kg/sao cho lua", seasonId: season1.id, assigneeId: farmer1.id, status: "todo", priority: "high", stage: "caring", dueDate: today },
    { title: "Phun thuoc tru sau", description: "Phun thuoc Regent 800WG phong tru sau duc than", seasonId: season1.id, assigneeId: farmer2.id, status: "doing", priority: "high", stage: "caring", dueDate: today },
    { title: "Kiem tra nuoc ruong", description: "Dam bao muc nuoc 3-5cm tren mat ruong", seasonId: season1.id, assigneeId: farmer1.id, status: "todo", priority: "medium", stage: "caring", dueDate: tomorrow },
    { title: "Chuyen cay ca phao ra ruong", description: "Cay con du 25 ngay tuoi, chuyen trong", seasonId: season2.id, assigneeId: farmer3.id, status: "doing", priority: "high", stage: "planting", dueDate: today },
    { title: "Lam dat luong ca phao", description: "Be luong rong 1.2m, cao 25cm", seasonId: season2.id, assigneeId: farmer2.id, status: "done", priority: "medium", stage: "planting", dueDate: twoDaysAgo },
    { title: "Thu hoach rau cai dot 3", description: "Cat rau, rua sach, dong goi 5kg/bao", seasonId: season3.id, assigneeId: farmer1.id, status: "todo", priority: "high", stage: "harvesting", dueDate: today },
    { title: "Giao rau cho dau moi", description: "Van chuyen 200kg rau cai cho chi Hoa - cho Ben Thanh", seasonId: season3.id, assigneeId: farmer3.id, status: "overdue", priority: "high", stage: "harvesting", dueDate: yesterday },
    { title: "Ghi nhat ky cham bon", description: "Cap nhat tien do cham bon lua tuan 8", seasonId: season1.id, assigneeId: farmer1.id, status: "todo", priority: "low", stage: "caring", dueDate: tomorrow },
  ]);

  await db.insert(supplies).values([
    { name: "Phan Ure", category: "Phan bon", unit: "kg", currentStock: 45, minThreshold: 50, status: "low" },
    { name: "Phan NPK 20-20-15", category: "Phan bon", unit: "kg", currentStock: 200, minThreshold: 100, status: "ok" },
    { name: "Regent 800WG", category: "Thuoc BVTV", unit: "goi", currentStock: 3, minThreshold: 5, status: "low" },
    { name: "Hat giong lua IR50404", category: "Hat giong", unit: "kg", currentStock: 0, minThreshold: 20, status: "out" },
    { name: "Mang phuy nong nghiep", category: "Vat tu khac", unit: "cuon", currentStock: 12, minThreshold: 5, status: "ok" },
  ]);

  const allSupplies = await db.select().from(supplies);
  const phanUre = allSupplies.find(s => s.name === "Phan Ure")!;
  const phanNPK = allSupplies.find(s => s.name === "Phan NPK 20-20-15")!;
  const thuocTruSau = allSupplies.find(s => s.name === "Regent 800WG")!;
  const hatGiong = allSupplies.find(s => s.name === "Hat giong lua IR50404")!;

  await db.insert(supplyTransactions).values([
    { supplyId: phanUre.id, seasonId: season1.id, type: "export", quantity: 30, note: "Bon phan thuc lan 1 cho lua" },
    { supplyId: phanNPK.id, seasonId: season1.id, type: "export", quantity: 50, note: "Bon lot cho lua" },
    { supplyId: thuocTruSau.id, seasonId: season1.id, type: "export", quantity: 2, note: "Phun thuoc tru sau dot 1" },
    { supplyId: phanUre.id, type: "import", quantity: 100, note: "Nhap kho tu dai ly" },
  ]);

  const now = Date.now();
  const climateData = [];
  for (let i = 23; i >= 0; i--) {
    climateData.push({
      temperature: 26 + Math.random() * 8 - 2,
      humidity: 65 + Math.random() * 25,
      rainfall: Math.random() > 0.7 ? Math.random() * 15 : 0,
      lightIntensity: i >= 6 && i <= 18 ? 300 + Math.random() * 700 : Math.random() * 50,
      soilMoisture: 40 + Math.random() * 30,
      soilPh: 5.8 + Math.random() * 1.2,
      recordedAt: new Date(now - i * 3600000),
    });
  }
  await db.insert(climateReadings).values(climateData as any);

  await db.insert(alerts).values([
    { type: "low_stock", severity: "critical", title: "Het hat giong lua", message: "Hat giong lua IR50404 da het, can nhap them truoc khi gieo vu moi.", isRead: false, relatedId: hatGiong.id },
    { type: "low_stock", severity: "warning", title: "Phan Ure sap het", message: "Ton kho Phan Ure chi con 45kg, duoi nguong toi thieu 50kg.", isRead: false, relatedId: phanUre.id },
    { type: "overdue_task", severity: "critical", title: "Cong viec qua han", message: "Giao rau cho dau moi da qua han 1 ngay. Can xu ly gap.", isRead: false },
    { type: "weather", severity: "warning", title: "Du bao mua lon", message: "Du bao 2 ngay toi co mua lon 50-80mm. Can kiem tra he thong thoat nuoc ruong lua.", isRead: false },
    { type: "stage_change", severity: "info", title: "Chuyen giai doan", message: "Rau cai quy 1 da chuyen sang giai doan thu hoach. Du kien hoan thanh 20/02.", isRead: true },
  ]);

  console.log("Seed data inserted successfully!");
}

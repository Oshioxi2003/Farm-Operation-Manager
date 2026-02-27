import { db } from "./db";
import { users, crops, seasons, tasks, supplies, supplyTransactions, climateReadings, alerts } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) return;

  await db.insert(users).values([
    { username: "admin", password: "admin123", fullName: "Nguyễn Văn Minh", role: "manager", phone: "0901234567" },
    { username: "farmer1", password: "123456", fullName: "Trần Thị Lan", role: "farmer", phone: "0912345678" },
    { username: "farmer2", password: "123456", fullName: "Lê Văn Hùng", role: "farmer", phone: "0923456789" },
    { username: "farmer3", password: "123456", fullName: "Phạm Thị Mai", role: "farmer", phone: "0934567890" },
  ]);

  await db.insert(crops).values([
    {
      name: "Lúa nước",
      variety: "IR50404",
      description: "Giống lúa năng suất cao, thích hợp vùng đồng bằng",
      growthDuration: 120,
      optimalTemp: "25-32",
      optimalHumidity: "70-85",
      optimalPh: "5.5-7.0",
      careInstructions: "Tưới nước đều, bón phân 3 đợt: lót, thúc 1, thúc 2. Phun thuốc phòng trừ sâu bệnh định kỳ.",
    },
    {
      name: "Cà pháo",
      variety: "Cà pháo trắng",
      description: "Giống cà pháo truyền thống, dễ trồng, năng suất ổn định",
      growthDuration: 75,
      optimalTemp: "22-30",
      optimalHumidity: "60-80",
      optimalPh: "6.0-6.8",
      careInstructions: "Trồng hàng cách hàng 50cm, cây cách cây 40cm. Tưới nước 2 lần/ngày.",
    },
    {
      name: "Rau cải",
      variety: "Cải ngọt",
      description: "Rau ngắn ngày, thu hoạch nhanh, nhu cầu tiêu thụ cao",
      growthDuration: 35,
      optimalTemp: "18-25",
      optimalHumidity: "65-80",
      optimalPh: "6.0-7.0",
      careInstructions: "Gieo hạt trực tiếp hoặc cây con. Tưới nước sáng chiều. Bón phân đạm định kỳ.",
    },
    {
      name: "Đậu phộng",
      variety: "L14",
      description: "Giống đậu phộng chịu hạn tốt, thích hợp đất cát pha",
      growthDuration: 100,
      optimalTemp: "25-30",
      optimalHumidity: "60-70",
      optimalPh: "5.5-6.5",
      careInstructions: "Làm đất kỹ, bẻ luống. Trồng khoảng cách 30x15cm. Vun gốc khi cây ra hoa.",
    },
  ]);

  // Query back inserted data (MySQL doesn't support .returning())
  const allFarmers = await db.select().from(users);
  const farmer1 = allFarmers.find(u => u.username === "farmer1")!;
  const farmer2 = allFarmers.find(u => u.username === "farmer2")!;
  const farmer3 = allFarmers.find(u => u.username === "farmer3")!;

  const allCrops = await db.select().from(crops);
  const lua = allCrops.find(c => c.name === "Lúa nước")!;
  const caPhao = allCrops.find(c => c.name === "Cà pháo")!;
  const rauCai = allCrops.find(c => c.name === "Rau cải")!;

  await db.insert(seasons).values([
    {
      name: "Vụ Đông Xuân 2025-2026",
      cropId: lua.id,
      status: "active",
      currentStage: "caring",
      startDate: "2025-11-15",
      endDate: "2026-03-15",
      area: 5.5,
      areaUnit: "ha",
      notes: "Mùa vụ chính, dự kiến năng suất cao",
      progress: 55,
    },
    {
      name: "Vụ Xuân Hè 2026",
      cropId: caPhao.id,
      status: "active",
      currentStage: "planting",
      startDate: "2026-02-01",
      endDate: "2026-05-15",
      area: 1.2,
      areaUnit: "ha",
      notes: "Trồng xen canh với đậu phộng",
      progress: 15,
    },
    {
      name: "Vụ Rau quý 1/2026",
      cropId: rauCai.id,
      status: "active",
      currentStage: "harvesting",
      startDate: "2026-01-10",
      endDate: "2026-02-20",
      area: 0.3,
      areaUnit: "ha",
      notes: "Thu hoạch cuốn chiếu, bán cho đầu mối",
      progress: 85,
    },
  ] as any);

  const allSeasons = await db.select().from(seasons);
  const season1 = allSeasons.find(s => s.name === "Vụ Đông Xuân 2025-2026")!;
  const season2 = allSeasons.find(s => s.name === "Vụ Xuân Hè 2026")!;
  const season3 = allSeasons.find(s => s.name === "Vụ Rau quý 1/2026")!;

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

  await db.insert(tasks).values([
    { title: "Bón phân thúc lần 2", description: "Bón phân urê 15kg/sào cho lúa", seasonId: season1.id, assigneeId: farmer1.id, status: "todo", priority: "high", stage: "caring", dueDate: today },
    { title: "Phun thuốc trừ sâu", description: "Phun thuốc Regent 800WG phòng trừ sâu đục thân", seasonId: season1.id, assigneeId: farmer2.id, status: "doing", priority: "high", stage: "caring", dueDate: today },
    { title: "Kiểm tra nước ruộng", description: "Đảm bảo mực nước 3-5cm trên mặt ruộng", seasonId: season1.id, assigneeId: farmer1.id, status: "todo", priority: "medium", stage: "caring", dueDate: tomorrow },
    { title: "Chuyển cây cà pháo ra ruộng", description: "Cây con đủ 25 ngày tuổi, chuyển trồng", seasonId: season2.id, assigneeId: farmer3.id, status: "doing", priority: "high", stage: "planting", dueDate: today },
    { title: "Làm đất luống cà pháo", description: "Bẻ luống rộng 1.2m, cao 25cm", seasonId: season2.id, assigneeId: farmer2.id, status: "done", priority: "medium", stage: "planting", dueDate: twoDaysAgo },
    { title: "Thu hoạch rau cải đợt 3", description: "Cắt rau, rửa sạch, đóng gói 5kg/bao", seasonId: season3.id, assigneeId: farmer1.id, status: "todo", priority: "high", stage: "harvesting", dueDate: today },
    { title: "Giao rau cho đầu mối", description: "Vận chuyển 200kg rau cải cho chị Hoa - chợ Bến Thành", seasonId: season3.id, assigneeId: farmer3.id, status: "overdue", priority: "high", stage: "harvesting", dueDate: yesterday },
    { title: "Ghi nhật ký chăm bón", description: "Cập nhật tiến độ chăm bón lúa tuần 8", seasonId: season1.id, assigneeId: farmer1.id, status: "todo", priority: "low", stage: "caring", dueDate: tomorrow },
  ] as any);

  await db.insert(supplies).values([
    { name: "Phân Urê", category: "Phân bón", unit: "kg", currentStock: 45, minThreshold: 50, status: "low" },
    { name: "Phân NPK 20-20-15", category: "Phân bón", unit: "kg", currentStock: 200, minThreshold: 100, status: "ok" },
    { name: "Regent 800WG", category: "Thuốc BVTV", unit: "gói", currentStock: 3, minThreshold: 5, status: "low" },
    { name: "Hạt giống lúa IR50404", category: "Hạt giống", unit: "kg", currentStock: 0, minThreshold: 20, status: "out" },
    { name: "Màng phủ nông nghiệp", category: "Vật tư khác", unit: "cuộn", currentStock: 12, minThreshold: 5, status: "ok" },
  ]);

  const allSupplies = await db.select().from(supplies);
  const phanUre = allSupplies.find(s => s.name === "Phân Urê")!;
  const phanNPK = allSupplies.find(s => s.name === "Phân NPK 20-20-15")!;
  const thuocTruSau = allSupplies.find(s => s.name === "Regent 800WG")!;
  const hatGiong = allSupplies.find(s => s.name === "Hạt giống lúa IR50404")!;

  await db.insert(supplyTransactions).values([
    { supplyId: phanUre.id, seasonId: season1.id, type: "export", quantity: 30, note: "Bón phân thúc lần 1 cho lúa" },
    { supplyId: phanNPK.id, seasonId: season1.id, type: "export", quantity: 50, note: "Bón lót cho lúa" },
    { supplyId: thuocTruSau.id, seasonId: season1.id, type: "export", quantity: 2, note: "Phun thuốc trừ sâu đợt 1" },
    { supplyId: phanUre.id, type: "import", quantity: 100, note: "Nhập kho từ đại lý" },
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
    { type: "low_stock", severity: "critical", title: "Hết hạt giống lúa", message: "Hạt giống lúa IR50404 đã hết, cần nhập thêm trước khi gieo vụ mới.", isRead: false, relatedId: hatGiong.id },
    { type: "low_stock", severity: "warning", title: "Phân Urê sắp hết", message: "Tồn kho Phân Urê chỉ còn 45kg, dưới ngưỡng tối thiểu 50kg.", isRead: false, relatedId: phanUre.id },
    { type: "overdue_task", severity: "critical", title: "Công việc quá hạn", message: "Giao rau cho đầu mối đã quá hạn 1 ngày. Cần xử lý gấp.", isRead: false },
    { type: "weather", severity: "warning", title: "Dự báo mưa lớn", message: "Dự báo 2 ngày tới có mưa lớn 50-80mm. Cần kiểm tra hệ thống thoát nước ruộng lúa.", isRead: false },
    { type: "stage_change", severity: "info", title: "Chuyển giai đoạn", message: "Rau cải quý 1 đã chuyển sang giai đoạn thu hoạch. Dự kiến hoàn thành 20/02.", isRead: true },
  ]);

  console.log("Seed data inserted successfully!");
}

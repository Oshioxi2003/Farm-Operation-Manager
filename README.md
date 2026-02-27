# 🌾 AgroManager — Hệ thống Quản lý Nông trại

Hệ thống quản lý nông nghiệp toàn diện, hỗ trợ quản lý mùa vụ, công việc, kho vật tư, theo dõi khí hậu thời gian thực và phân quyền người dùng.

## 📸 Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| 🔐 Đăng nhập & Phân quyền | Hệ thống JWT auth với 2 vai trò: **Quản lý** và **Nông dân** |
| 📊 Dashboard | Tổng quan hoạt động: mùa vụ, công việc hôm nay, cảnh báo |
| 🌱 Cây trồng | Danh mục cây trồng, hướng dẫn chăm sóc, thông số tối ưu |
| 📅 Mùa vụ | Quản lý mùa vụ theo giai đoạn (gieo trồng → chăm bón → thu hoạch) |
| ✅ Công việc | Tạo, phân công, theo dõi tiến độ (Kanban: Chờ → Đang làm → Xong) |
| 📝 Nhật ký sản xuất | Ghi chép hoạt động hàng ngày theo mùa vụ |
| 📦 Kho vật tư | Quản lý tồn kho, nhập/xuất kho, cảnh báo hết hàng |
| 🌤️ Khí hậu | Dữ liệu thời tiết **thời gian thực** từ Open-Meteo API (Hà Nội) |
| 🔔 Cảnh báo | Thông báo tự động: thời tiết cực đoan, hết vật tư, công việc quá hạn |

## 🏗️ Kiến trúc

```
Farm-Operation-Manager/
├── client/                 # Frontend - React + Vite
│   └── src/
│       ├── components/     # UI components (shadcn/ui)
│       ├── pages/          # Các trang: dashboard, crops, seasons, ...
│       ├── lib/            # Auth context, query client
│       └── hooks/          # Custom hooks
├── server/                 # Backend - Express.js
│   ├── index.ts            # Entry point
│   ├── routes.ts           # API routes + role middleware
│   ├── auth.ts             # JWT authentication
│   ├── storage.ts          # Database access layer (Drizzle ORM)
│   ├── weather.ts          # Open-Meteo API integration
│   ├── seed.ts             # Dữ liệu mẫu
│   └── db.ts               # MySQL connection
├── shared/
│   └── schema.ts           # Database schema (Drizzle ORM)
└── .env                    # Biến môi trường
```

## 🛠️ Công nghệ

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, Recharts |
| Backend | Express.js, TypeScript, JWT (jsonwebtoken) |
| Database | MySQL 8+ (Drizzle ORM) |
| API bên ngoài | Open-Meteo (thời tiết thời gian thực, miễn phí) |

## 🚀 Cài đặt & Chạy

### Yêu cầu
- **Node.js** >= 18
- **MySQL** 8+

### Bước 1: Clone & cài đặt dependencies

```bash
git clone https://github.com/your-repo/Farm-Operation-Manager.git
cd Farm-Operation-Manager
npm install
```

### Bước 2: Cấu hình database

Tạo database MySQL:

```sql
CREATE DATABASE farm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Tạo file `.env`:

```env
DATABASE_URL=mysql://root:123456@localhost:3306/farm
```

### Bước 3: Đẩy schema vào database

```bash
npx drizzle-kit push --force
```

### Bước 4: Chạy ứng dụng

```bash
npm run dev
```

Truy cập: **http://localhost:5000**

## 👥 Phân quyền

### Tài khoản demo

| Vai trò | Username | Password |
|---------|----------|----------|
| 👨‍💼 Quản lý | `admin` | `admin123` |
| 👨‍🌾 Nông dân | `farmer1` | `farmer123` |

### Ma trận quyền

| Chức năng | Nông dân | Quản lý |
|-----------|:--------:|:-------:|
| Xem dashboard, mùa vụ, khí hậu | ✅ | ✅ |
| Cập nhật trạng thái công việc | ✅ | ✅ |
| Tạo nhật ký sản xuất | ✅ | ✅ |
| Tạo/sửa/xóa cây trồng | ❌ | ✅ |
| Tạo/sửa/xóa mùa vụ | ❌ | ✅ |
| Tạo công việc, phân công | ❌ | ✅ |
| Quản lý kho vật tư | ❌ | ✅ |
| Quản lý người dùng | ❌ | ✅ |

## 📡 API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |

### CRUD Resources (yêu cầu đăng nhập)
| Resource | GET | POST | PATCH | DELETE |
|----------|-----|------|-------|--------|
| `/api/crops` | Tất cả | Manager | Manager | Manager |
| `/api/seasons` | Tất cả | Manager | Manager | Manager |
| `/api/tasks` | Tất cả | Manager | Tất cả* | Manager |
| `/api/work-logs` | Tất cả | Tất cả | — | — |
| `/api/supplies` | Tất cả | Manager | Manager | Manager |
| `/api/supply-transactions` | Tất cả | Manager | — | — |
| `/api/weather` | Tất cả | — | — | — |
| `/api/alerts` | Tất cả | Manager | Tất cả | — |

> \* Nông dân chỉ được cập nhật trạng thái (status) công việc.

## 🌤️ Tích hợp thời tiết

- **Nguồn**: [Open-Meteo API](https://open-meteo.com/) — miễn phí, không cần API key
- **Vị trí**: Hà Nội (21.03°N, 105.85°E)
- **Dữ liệu**: Nhiệt độ, độ ẩm, lượng mưa, tốc độ gió, ánh sáng (ước tính)
- **Cache**: 15 phút
- **Đồng bộ DB**: Tự động lưu vào bảng `climate_readings` khi truy cập

## 📜 Scripts

```bash
npm run dev          # Chạy development server
npm run build        # Build production
npm run start        # Chạy production
npm run check        # Type-check TypeScript
npm run db:push      # Đẩy schema lên database
node reset-db.cjs    # Reset toàn bộ dữ liệu (truncate all tables)
```

## 📄 License

MIT

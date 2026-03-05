# 🌾 Farm Operation Manager

Hệ thống quản lý hoạt động nông trại — hỗ trợ quản lý cây trồng, mùa vụ, công việc, vật tư, nhật ký canh tác và theo dõi thời tiết.

## 📋 Tính năng chính

| Module | Mô tả |
|--------|-------|
| **Quản lý Cây trồng** | Thêm, sửa, xóa thông tin cây trồng (giống, thời gian sinh trưởng, điều kiện tối ưu) |
| **Quản lý Mùa vụ** | Tạo mùa vụ, theo dõi tiến độ qua 4 giai đoạn (chuẩn bị → gieo trồng → chăm sóc → thu hoạch), sao chép mùa vụ |
| **Quản lý Công việc** | Phân công, theo dõi trạng thái (chờ làm / đang làm / hoàn thành / quá hạn), upload ảnh minh chứng |
| **Nhật ký canh tác** | Ghi nhận hoạt động, giờ làm việc, vật tư sử dụng |
| **Quản lý Vật tư** | Theo dõi tồn kho, nhập/xuất vật tư, cảnh báo hết hàng |
| **Thời tiết & Khí hậu** | Dữ liệu thời tiết thực tế, biểu đồ nhiệt độ/độ ẩm/lượng mưa |
| **Cảnh báo & Thông báo** | Cảnh báo tự động (quá hạn, tồn kho thấp, thời tiết cực đoan) |
| **Phân quyền** | 2 vai trò: Quản lý (manager) và Nông dân (farmer) |

## 🛠️ Công nghệ sử dụng

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Radix UI + Recharts
- **Backend:** Express 5 + TypeScript
- **Database:** MySQL + Drizzle ORM
- **Auth:** JWT (HttpOnly Cookie)

## ⚡ Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) >= 18
- [MySQL](https://www.mysql.com/) >= 8.0

## 🚀 Cài đặt & Chạy

### 1. Clone dự án

```bash
git clone https://github.com/Oshioxi2003/Farm-Operation-Manager.git
cd Farm-Operation-Manager
```

### 2. Cấu hình môi trường

Tạo file `.env` từ file mẫu:

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin database của bạn:

```env
DATABASE_URL=mysql://root:123456@localhost:3306/farm
```

### 3. Cài đặt dependencies

```bash
npm install
```

### 4. Khởi tạo database

```bash
npx drizzle-kit push --force
```

### 5. Chạy ứng dụng

```bash
npm run dev
```

Hoặc trên Windows, double-click file `run.bat`.

Ứng dụng mặc định chạy tại: **http://localhost:5000**

## 📁 Cấu trúc dự án

```
Farm-Operation-Manager/
├── client/                 # Frontend (React + Vite)
│   └── src/
│       ├── components/     # UI components (Radix UI + shadcn/ui)
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities & helpers
│       ├── pages/          # Các trang chính
│       │   ├── dashboard.tsx
│       │   ├── crops.tsx / crop-detail.tsx
│       │   ├── seasons.tsx / season-progress.tsx
│       │   ├── tasks.tsx
│       │   ├── work-logs.tsx
│       │   ├── supplies.tsx
│       │   ├── climate.tsx
│       │   ├── users-page.tsx
│       │   └── login.tsx
│       ├── App.tsx
│       └── index.css
├── server/                 # Backend (Express)
│   ├── index.ts            # Entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database queries (Drizzle)
│   ├── auth.ts             # JWT authentication
│   ├── db.ts               # Database connection
│   ├── weather.ts          # Weather API integration
│   └── seed.ts             # Seed data
├── shared/
│   └── schema.ts           # Drizzle schema & Zod validations
├── media/                  # Uploaded files (crops, work-logs)
├── drizzle.config.ts
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── run.bat                 # Windows launcher
```

## 👤 Tài khoản mặc định

| Vai trò | Username | Password |
|---------|----------|----------|
| Quản lý | `admin` | `123456` |
| Nông dân | `farmer1` | `123456` |

> ⚠️ Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.

## 📝 Scripts

| Lệnh | Mô tả |
|-------|-------|
| `npm run dev` | Chạy development server |
| `npm run build` | Build production |
| `npm run start` | Chạy production server |
| `npm run check` | Kiểm tra TypeScript |
| `npm run db:push` | Đồng bộ database schema |

## 📄 License

MIT License

# 📡 API Documentation

Base URL: `http://localhost:5000/api`

Tất cả API (trừ Auth) yêu cầu cookie JWT. Gửi request với `credentials: "include"`.

---

## 🔐 Auth (Public)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/auth/login` | Đăng nhập (`{ username, password }`) |
| `POST` | `/auth/logout` | Đăng xuất |
| `GET` | `/auth/me` | Lấy thông tin user hiện tại |

---

## 👤 Users (Manager only)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/users` | Danh sách tất cả users |
| `GET` | `/users/:id` | Chi tiết user |
| `POST` | `/users` | Tạo user mới |
| `PATCH` | `/users/:id` | Cập nhật (password, isLocked) |

---

## 🌱 Crops

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/crops` | Auth | Danh sách cây trồng |
| `GET` | `/crops/:id` | Auth | Chi tiết cây trồng |
| `POST` | `/crops` | Manager | Thêm cây trồng |
| `PATCH` | `/crops/:id` | Manager | Sửa cây trồng |
| `DELETE` | `/crops/:id` | Manager | Xóa cây trồng |

---

## 📅 Seasons

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/seasons` | Auth | Danh sách mùa vụ |
| `GET` | `/seasons/active` | Auth | Mùa vụ đang hoạt động |
| `GET` | `/seasons/:id` | Auth | Chi tiết mùa vụ |
| `POST` | `/seasons` | Manager | Tạo mùa vụ |
| `POST` | `/seasons/:id/copy` | Manager | Sao chép mùa vụ |
| `PATCH` | `/seasons/:id` | Auth* | Cập nhật mùa vụ |
| `DELETE` | `/seasons/:id` | Manager | Xóa mùa vụ (chỉ khi `planning`) |

> *Farmer chỉ được cập nhật: `currentStage`, `progress`, `status`

---

## ✅ Tasks

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/tasks` | Auth | Danh sách công việc (Farmer chỉ thấy của mình) |
| `GET` | `/tasks/today` | Auth | Công việc hôm nay |
| `GET` | `/tasks/season/:seasonId` | Auth | Công việc theo mùa vụ |
| `GET` | `/tasks/:id` | Auth | Chi tiết công việc |
| `POST` | `/tasks` | Manager | Tạo công việc |
| `PATCH` | `/tasks/:id` | Auth* | Cập nhật công việc |
| `DELETE` | `/tasks/:id` | Manager | Xóa công việc (chỉ khi `todo`) |

> *Farmer: cập nhật `status`, `proofImage`, `harvestYield`. Manager: không được đánh dấu `done`.

---

## 📝 Work Logs

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/work-logs` | Auth | Danh sách nhật ký (Farmer chỉ thấy của mình) |
| `GET` | `/work-logs/season/:seasonId` | Auth | Nhật ký theo mùa vụ |
| `POST` | `/work-logs` | Auth | Tạo nhật ký |

---

## 📦 Supplies

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/supplies` | Auth | Danh sách vật tư |
| `GET` | `/supplies/low-stock` | Auth | Vật tư sắp hết |
| `GET` | `/supplies/:id` | Auth | Chi tiết vật tư |
| `POST` | `/supplies` | Manager | Thêm vật tư |
| `PATCH` | `/supplies/:id` | Manager | Sửa vật tư |
| `DELETE` | `/supplies/:id` | Manager | Xóa vật tư |

---

## 💰 Supply Transactions

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/supply-transactions` | Auth | Tất cả giao dịch |
| `GET` | `/supply-transactions/supply/:supplyId` | Auth | Giao dịch theo vật tư |
| `POST` | `/supply-transactions` | Auth* | Tạo giao dịch |

> *Farmer chỉ tạo được giao dịch xuất (`type: "export"`)

---

## 🌤️ Weather & Climate

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/weather` | Auth | Dữ liệu thời tiết (tự đồng bộ DB) |
| `GET` | `/climate?limit=100` | Auth | Dữ liệu khí hậu từ DB |
| `POST` | `/climate` | Manager | Thêm dữ liệu khí hậu |

---

## 🔔 Alerts

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/alerts` | Auth | Tất cả cảnh báo |
| `GET` | `/alerts/unread` | Auth | Cảnh báo chưa đọc |
| `PATCH` | `/alerts/:id/read` | Auth | Đánh dấu đã đọc |
| `POST` | `/alerts/read-all` | Auth | Đánh dấu tất cả đã đọc |
| `POST` | `/alerts` | Manager | Tạo cảnh báo |

---

## 🔔 Notifications

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/notifications` | Auth | Thông báo của user hiện tại |
| `GET` | `/notifications/unread` | Auth | Thông báo chưa đọc |
| `PATCH` | `/notifications/:id/read` | Auth | Đánh dấu đã đọc |
| `POST` | `/notifications/read-all` | Auth | Đánh dấu tất cả đã đọc |

---

## 📤 Upload

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `POST` | `/upload/crops` | Manager | Upload ảnh cây trồng (`{ base64, filename }`) |
| `POST` | `/upload/work-logs` | Auth | Upload ảnh nhật ký (`{ base64, filename }`) |

---

## 📊 Dashboard

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/dashboard/stats` | Auth | Thống kê tổng quan |

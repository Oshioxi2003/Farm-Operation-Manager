# 🤝 Hướng dẫn đóng góp

Cảm ơn bạn đã quan tâm đến dự án **Farm Operation Manager**! Mọi đóng góp đều được chào đón.

## 🚀 Bắt đầu

1. **Fork** repository về tài khoản của bạn
2. **Clone** về máy:
   ```bash
   git clone https://github.com/<your-username>/Farm-Operation-Manager.git
   cd Farm-Operation-Manager
   ```
3. Tạo **branch** mới:
   ```bash
   git checkout -b feature/ten-tinh-nang
   ```
4. Cài đặt dependencies:
   ```bash
   npm install
   ```
5. Cấu hình `.env` (xem [README.md](README.md))

## 📐 Quy tắc code

### Cấu trúc

- **Frontend:** Đặt component trong `client/src/components/`, page trong `client/src/pages/`
- **Backend:** API routes trong `server/routes.ts`, database queries trong `server/storage.ts`
- **Schema:** Định nghĩa bảng và validation trong `shared/schema.ts`

### Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| File component | kebab-case | `crop-detail.tsx` |
| Component | PascalCase | `CropDetail` |
| Function/Variable | camelCase | `getCropById` |
| Database column | snake_case | `created_at` |
| API endpoint | kebab-case | `/api/work-logs` |

### Commit message

Sử dụng format: `<type>: <mô tả ngắn>`

```
feat: thêm chức năng sao chép mùa vụ
fix: sửa lỗi xóa vật tư khi có giao dịch liên quan
docs: cập nhật README
style: chỉnh sửa giao diện trang dashboard
refactor: tách logic xác thực ra file auth.ts
```

## 🔄 Quy trình Pull Request

1. Đảm bảo code chạy không lỗi: `npm run check`
2. Commit và push lên branch của bạn
3. Tạo **Pull Request** vào branch `main`
4. Mô tả rõ những thay đổi trong PR description

## 🐛 Báo lỗi

Khi tạo Issue, vui lòng cung cấp:

- Mô tả lỗi
- Các bước tái tạo lỗi
- Kết quả mong đợi vs kết quả thực tế
- Screenshot (nếu có)
- Môi trường (OS, Node version, Browser)

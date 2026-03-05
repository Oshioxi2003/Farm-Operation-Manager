# 📋 Nhật ký thay đổi (Changelog)

Tất cả thay đổi đáng chú ý của dự án sẽ được ghi nhận tại đây.

## [1.0.0] - 2026-03-05

### ✨ Tính năng mới
- Đăng nhập / Đăng xuất với JWT (HttpOnly Cookie)
- Quản lý cây trồng (CRUD) với upload ảnh
- Trang chi tiết cây trồng
- Quản lý mùa vụ (tạo, sửa, xóa, sao chép)
- Theo dõi tiến độ mùa vụ qua 4 giai đoạn
- Tính tiến độ tự động dựa trên tỷ lệ công việc hoàn thành
- Quản lý công việc (tạo, phân công, hoàn thành, xóa)
- Upload ảnh minh chứng khi hoàn thành công việc
- Tự động phát hiện và thông báo công việc quá hạn
- Nhật ký canh tác với ghi nhận vật tư sử dụng
- Quản lý kho vật tư (nhập/xuất, theo dõi tồn kho)
- Tích hợp dữ liệu thời tiết thực tế (Open-Meteo API)
- Biểu đồ khí hậu (nhiệt độ, độ ẩm, lượng mưa)
- Hệ thống cảnh báo (tồn kho thấp, quá hạn, thời tiết)
- Hệ thống thông báo cá nhân
- Dashboard tổng quan
- Phân quyền Manager / Farmer
- Khóa / Mở khóa tài khoản người dùng
- Đổi mật khẩu người dùng

### 🐛 Sửa lỗi
- Sửa lỗi xóa cây trồng khi còn mùa vụ liên quan
- Sửa lỗi xóa vật tư khi có giao dịch và nhật ký liên quan
- Gộp nhiều ảnh vào một nhật ký khi tiến giai đoạn

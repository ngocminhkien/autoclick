# Auto Click Đa Điểm - Chrome & Edge Extension (Manifest V3)

Tiện ích mở rộng trình duyệt hỗ trợ tự động click nhiều điểm với cơ chế ghi nhớ tọa độ bằng phím tắt, chạy vòng lặp tùy chỉnh và lưu trữ dữ liệu vĩnh viễn trên ổ cứng máy tính.

## Tính Năng Chính
- **Ghi nhớ đa điểm bằng phím tắt:** Nhấn `F2` để bắt đầu ghi các điểm click, nhấn lại `F2` để lưu.
- **Hiển thị trực quan:** Đánh số thứ tự các điểm ghim 📍 1, 2, 3... trên màn hình, hỗ trợ kéo thả điều chỉnh tọa độ.
- **Chạy tự động & Dừng khẩn cấp:** Nhấn `F4` để chạy hoặc bấm `Esc` để dừng ngay lập tức.
- **Tùy chỉnh vòng lặp:**
  - Tùy chỉnh độ trễ giữa các lần click (ms).
  - Tùy chỉnh thời gian nghỉ giữa các vòng lặp (giây).
  - Tùy chỉnh số lần lặp (vô hạn hoặc số lần cụ thể).
- **Lưu trữ vĩnh viễn (Persistent Storage):** Sử dụng `chrome.storage.local` lưu trực tiếp xuống ổ cứng, giữ nguyên kịch bản sau khi đóng trình duyệt hoặc tắt laptop.
- **Quản lý kịch bản:** Đặt tên, lưu trữ nhiều kịch bản, xuất / nhập file `.json`.
- **Giao diện Shadow DOM:** Bảng điều khiển nổi kéo thả mượt mà, không xung đột CSS với các website.

## Cài Đặt
1. Vào `chrome://extensions` hoặc `edge://extensions`.
2. Bật **Chế độ dành cho nhà phát triển (Developer mode)**.
3. Chọn **Tải tiện ích đã giải nén (Load unpacked)** và chọn thư mục này (`E:\exténion web`).
4. Xem hướng dẫn chi tiết tại [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md).

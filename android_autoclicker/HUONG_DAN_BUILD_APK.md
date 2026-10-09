# HƯỚNG DẪN BUILD FILE APK CHO ĐIỆN THOẠI ANDROID (V2.1 NATIVE)

Dự án **Auto Clicker Đa Kịch Bản (Android Native)** trong thư mục `android_autoclicker` đã được lập trình hoàn chỉnh bằng **Kotlin** với kiến trúc:
- **`AccessibilityService` (Hỗ trợ tiếp cận):** Giả lập thao tác chạm tay thật (`dispatchGesture`) đè lên **mọi Game và Ứng dụng** (Shopee, TikTok, game cày cuốc, giả lập...).
- **`FloatingOverlayService` (Cửa sổ nổi):** Thanh menu điều khiển và các vòng tròn ghim `1`, `2`, `3`... nổi lơ lửng trên màn hình điện thoại, có thể kéo thả tự do.
- **`PriorityScheduler`:** Đầy đủ tính năng phân chia độ ưu tiên (Cao, TB, Thấp), lặp 2 chiều tuần hoàn, đếm ngay khi bắt đầu / sau khi kết thúc và đếm số lượt đã chạy.

---

## 🛠️ CÁCH 1: BUILD APK BẰNG ANDROID STUDIO (Dành cho máy tính có Android Studio)

1. Tải và cài đặt **[Android Studio](https://developer.android.com/studio)** (miễn phí).
2. Mở Android Studio ➔ Chọn **Open** (Mở dự án).
3. Trỏ đến thư mục:
   ```text
   e:\exténion web\android_autoclicker
   ```
4. Chờ Android Studio tải các thư viện Gradle (quá trình này mất khoảng 1 - 2 phút tùy tốc độ mạng).
5. Trên thanh menu trên cùng, bấm:
   ```text
   Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)
   ```
6. Khi hoàn tất, góc dưới bên phải sẽ hiện thông báo **"Build APK(s): locate"**. Bấm vào chữ **locate**, bạn sẽ thấy file:
   ```text
   app-debug.apk
   ```
7. Chép file `app-debug.apk` này sang điện thoại Android (qua Zalo, Telegram, Google Drive hoặc cắm cáp USB) và bấm Cài đặt!

---

## ☁️ CÁCH 2: BUILD APK ONLINE TỰ ĐỘNG BẰNG GITHUB ACTIONS (KHÔNG CẦN CÀI ANDROID STUDIO)

Nếu máy tính của bạn không có sẵn Android Studio (dung lượng quá nặng), tôi đã tạo sẵn cấu hình **GitHub Actions Workflow** (`.github/workflows/build-apk.yml`) để máy chủ đám mây của GitHub tự động biên dịch APK cho bạn hoàn toàn miễn phí:

1. Đăng nhập vào [GitHub](https://github.com) và tạo một **Repository mới** (ví dụ: `my-autoclicker-android`).
2. Tải toàn bộ nội dung trong thư mục `android_autoclicker` lên Repository này.
3. Ngay khi code được đưa lên, GitHub Actions sẽ tự động kích hoạt tiến trình Build APK:
   - Vào tab **Actions** trên GitHub.
   - Bấm vào tiến trình build đang chạy **"Build AutoClicker APK"** (mất khoảng 1 - 2 phút).
   - Khi hiện dấu tích xanh ✅ thành công, cuộn xuống mục **Artifacts** ở dưới cùng.
   - Bấm tải file **`AutoClicker-MultiScript-APK.zip`**.
4. Giải nén file zip ra, bạn sẽ có ngay file `app-debug.apk` sẵn sàng cài lên điện thoại Android!

---

## 📱 CÁCH SỬ DỤNG TRÊN ĐIỆN THOẠI ANDROID

Sau khi cài đặt file `.apk` vào điện thoại:

1. **Mở ứng dụng "Auto Click Đa Kịch Bản":**
   - **Bước 1:** Bấm nút **"Bật Hỗ Trợ Tiếp Cận"** ➔ Hệ thống sẽ mở cài đặt của Android ➔ Tìm mục *Dịch vụ đã tải xuống (Downloaded Services)* ➔ Chọn **Auto Click Đa Kịch Bản** ➔ Gạt sang **BẬT (ON)**.
   - **Bước 2:** Bấm nút **"Cấp Quyền Vẽ Nổi"** ➔ Cho phép quyền *Hiển thị trên ứng dụng khác (Draw over other apps)*.
2. **Khởi động thanh điều khiển:**
   - Bấm nút to màu xanh lá **"🚀 KHỞI ĐỘNG THANH ĐIỀU KHIỂN NỔI"**.
   - Ứng dụng sẽ tự động thu nhỏ và một thanh menu nhỏ sẽ nổi lơ lửng trên màn hình điện thoại của bạn.
3. **Thao tác trên màn hình:**
   - Bấm nút **`➕`** trên thanh nổi để thêm các điểm click (vòng tròn số `1`, `2`, `3`...).
   - Chạm và kéo các vòng tròn ghim số đặt vào các vị trí cần bấm trong Game hoặc App.
   - Bấm nút **`👁️`** để ẩn/hiện các điểm ghim khi cần.
   - Bấm nút **`📑`** để chuyển đổi nhanh giữa các kịch bản.
   - Bấm nút **`▶️`** để bắt đầu tự động click.
   - Bấm nút **`⏸️`** để tạm dừng.
   - Bấm nút **`✕`** để tắt hoàn toàn thanh điều khiển nổi.

> 💡 **Mẹo cho máy Xiaomi / Samsung / Oppo / Vivo:**  
> Vào mục Quản lý ứng dụng ➔ Chọn app *Auto Click Đa Kịch Bản* ➔ Bật **Tự khởi chạy (Autostart)** và chuyển Tiết kiệm pin sang **Không hạn chế (No restrictions)** để app có thể click cày cuốc cả ngày mà không bị hệ điều hành tắt ngầm!

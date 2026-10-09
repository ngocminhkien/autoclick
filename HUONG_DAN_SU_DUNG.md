# HƯỚNG DẪN SỬ DỤNG AUTO CLICK ĐA KỊCH BẢN & ĐIỀU PHỐI ƯU TIÊN (V2.0)

Phiên bản nâng cấp **Auto Click Đa Điểm V2.0** giải quyết triệt để tình trạng **chạy đè kịch bản khi trùng giờ chạy**, cho phép chạy nhiều kịch bản song song với chu kỳ lặp riêng và tự động điều phối theo **Độ ưu tiên (Priority Queue)**.

---

## 🚀 1. Các Tính Năng Nâng Cấp V2.0

### 1.1. Chạy Nhiều Kịch Bản Đồng Thời (Multi-Script Execution)
- Bạn có thể tạo không giới hạn số lượng kịch bản trên cùng một trang web (ví dụ: Kịch bản Nhận Quà VIP, Kịch bản Điểm Danh, Kịch bản Farm Điểm...).
- Mỗi kịch bản có:
  - **Chu kỳ lặp độc lập:** Ví dụ: Kịch bản A lặp mỗi 5 giây, Kịch bản B lặp mỗi 30 giây, Kịch bản C lặp mỗi 5 phút.
  - **Danh sách điểm click riêng:** Tọa độ và số điểm click riêng biệt.
  - **Công tắc Bật/Tắt riêng:** Bạn có thể bật 2, 3 hoặc 10 kịch bản chạy song song.

### 1.2. Khóa Chuột An Toàn (Mouse Mutex Lock) & Chống Chạy Đè
- Trong môi trường trình duyệt, chuột chỉ có thể thao tác tuần tự. Nếu 2 script click cùng lúc, trang web sẽ bị giật, mất tiêu điểm hoặc click nhầm.
- **Giải pháp:** Hệ thống sử dụng **Khóa Chuột Mutex**. Tại bất kỳ thời điểm nào, **chỉ có duy nhất 1 kịch bản được quyền click**.
- Các kịch bản khác nếu đến giờ sẽ tự động xếp vào **Hàng Đợi Chờ (Queue)** và hiển thị trạng thái *"⏳ Hàng đợi (#1)"*.

### 1.3. Phân Cấp Mức Độ Ưu Tiên (Priority Scheduler)
Khi nhiều kịch bản **trùng thời điểm kích hoạt** (ví dụ cả 2 cùng đến hẹn ở giây thứ 30):
- **⭐ Mức 1: Ưu tiên Cao (High):** Luôn luôn được trao quyền click trước tiên!
- **🔷 Mức 2: Ưu tiên Trung bình (Normal):** Chạy tiếp theo sau mức Cao.
- **⚪ Mức 3: Ưu tiên Thấp (Low):** Chờ các kịch bản ưu tiên cao hơn hoàn tất rồi mới chạy.
- **Thanh Banner Hàng Đợi:** Hiển thị trực tiếp kịch bản nào đang chiếm chuột và kịch bản nào đang xếp hàng kế tiếp.

---

## 🎯 2. Cách Sử Dụng Tính Năng Đa Kịch Bản

### Bước 1: Tạo và Đặt Cấu Hình Kịch Bản
1. Mở trang web cần chạy auto click.
2. Trên bảng điều khiển nổi, tại tab **🎛️ Đa Kịch Bản**:
   - Nhấn **"+ Thêm Kịch Bản"** để tạo kịch bản mới (ví dụ: Kịch bản 1, Kịch bản 2...).
   - **Chọn mức ưu tiên:** Bấm vào menu chọn `⭐ Ưu tiên Cao`, `🔷 Ưu tiên TB` hoặc `⚪ Ưu tiên Thấp`.
   - **Chỉnh thời gian lặp:** Nhập số giây lặp lại ở ô *"Lặp mỗi: [ ... ] giây"*.

### Bước 2: Ghi Điểm Click Cho Từng Kịch Bản
1. Trên thẻ kịch bản muốn ghi điểm, bấm nút **"Chọn ghi"** (hoặc chuyển sang tab **📍 Điểm Click** và chọn kịch bản từ menu thả xuống).
2. Nhấn phím **`F2`** trên bàn phím (hoặc nút **🔴 Ghi Điểm** trên thanh công cụ).
3. Click vào các vị trí cần bấm trên trang (ghim 📍 1, 2, 3... sẽ xuất hiện).
   - Màu sắc của ghim sẽ phản ánh đúng mức ưu tiên của kịch bản (Đỏ = Cao, Xanh = TB, Xám = Thấp).
4. Nhấn lại **`F2`** để lưu các điểm click vào kịch bản đó.
5. Làm tương tự cho các kịch bản khác.

### Bước 3: Khởi Động Bộ Điều Phối Đa Kịch Bản
1. Gạt công tắc bật những kịch bản bạn muốn cho chạy cùng lúc.
2. Nhấn phím **`F4`** (hoặc nút **▶️ Chạy Tất Cả**).
3. **Bộ điều phối ưu tiên sẽ tự động vận hành:**
   - Script nào đến giờ sẽ kích hoạt.
   - Nếu trùng giờ, Script **⭐ Ưu tiên Cao** sẽ chạy trước.
   - Script còn lại xếp hàng đợi và chạy ngay sau khi Script đầu tiên xong.
4. **Dừng khẩn cấp:** Bấm **`F4`** hoặc bấm phím **`Esc`** để dừng tất cả ngay lập tức.

---

## 💾 3. Lưu Trữ Vĩnh Viễn Không Lo Mất Dữ Liệu
- Toàn bộ danh sách đa kịch bản, các điểm click, chu kỳ lặp và mức ưu tiên được lưu vào `chrome.storage.local`.
- **Tắt trình duyệt, tắt hẳn máy tính hay khởi động lại laptop**, khi mở lại trình duyệt toàn bộ cấu hình đa kịch bản vẫn còn nguyên 100%!
- Có nút **"📤 Xuất Kịch Bản"** (JSON) trong tab Cài Đặt để bạn tải toàn bộ kịch bản về lưu trữ an toàn ra máy tính.

---

## 🧪 4. Thử Nghiệm Tình Huống Trùng Giờ (Collision Scenario)
Để kiểm chứng việc chống chạy đè:
1. Mở file [test/test-page.html](file:///e:/exte%CC%81nion%20web/test/test-page.html) trên trình duyệt.
2. Tạo **Kịch bản 1** (Click Nút A - VIP) ➔ Chọn **⭐ Ưu tiên Cao** ➔ Lặp mỗi: **5 giây**.
3. Tạo **Kịch bản 2** (Click Nút B - Phụ) ➔ Chọn **⚪ Ưu tiên Thấp** ➔ Lặp mỗi: **5 giây**.
---

## 🪟 5. Khi Người Dùng Thu Nhỏ Trình Duyệt (Minimize Window) Thì Sao?

Đây là câu hỏi rất quan trọng vì mặc định các trình duyệt như Chrome/Edge có cơ chế **"tiết kiệm pin & tài nguyên"**:
- Khi cửa sổ bị thu nhỏ (Minimize xuống Taskbar), trình duyệt sẽ làm chậm các bộ đếm thời gian (`setInterval` bị bóp nghẽn xuống 1 phút mới chạy 1 lần) và ngừng dựng hình ảnh (tọa độ viewport `x, y` không còn trả về phần tử).

### Extension này đã giải quyết vấn đề đó như thế nào?
1. **Bộ đếm Web Worker chạy luồng ngầm (Unthrottled Web Worker Heartbeat):**
   - Extension tạo một luồng Web Worker độc lập trong nền.
   - Luồng Worker này **hoàn toàn không bị ảnh hưởng** bởi trạng thái ẩn/hiện của cửa sổ trình duyệt, giúp bộ điều phối ưu tiên vẫn kích hoạt chính xác từng mili-giây theo đúng chu kỳ bạn đã đặt.
2. **Cơ chế Nhận Diện Kép (Tọa Độ + DOM Selector):**
   - Khi bạn bấm `F2` để ghi điểm, extension không chỉ ghi tọa độ `(x, y)` mà còn tự động phân tích và lưu lại **CSS Selector / Đường dẫn phần tử** của nút đó.
   - Khi cửa sổ trình duyệt bị thu nhỏ xuống Taskbar (`document.hidden = true`), hệ thống tự động kích hoạt cơ chế dự phòng: tìm chính xác nút bấm thông qua Selector và kích hoạt chuỗi sự kiện click trực tiếp lên phần tử.
3. **Kết luận:**
   - Bạn hoàn toàn có thể **thu nhỏ trình duyệt xuống Taskbar** để làm việc khác, xem phim, chơi game mà **auto click vẫn chạy đều đặn và không bị dừng lại**!

---

## 👁️ 6. Nút Ẩn / Hiện Các Điểm Ghim Trên Màn Hình

Nếu bạn không muốn các vòng tròn số 📍 `1`, `2`, `3`... che khuất tầm nhìn khi đang quan sát màn hình, xem video hoặc chơi game:

- **Cách sử dụng:**
  - Bấm nút **`👁️ Ẩn Điểm`** (nằm ngay cạnh nút *"➕ Thêm Kịch Bản Mới"*).
  - Hoặc bấm biểu tượng **`👁️`** trên thanh tiêu đề của bảng điều khiển.
- **Hiệu quả:**
  - Toàn bộ các vòng tròn ghim số trên màn hình sẽ lập tức biến mất giúp màn hình thoáng đãng, rõ ràng.
  - Khi cần chỉnh sửa lại vị trí, chỉ cần bấm **`🕶️ Hiện Điểm`** là các ghim sẽ xuất hiện trở lại.
  - **Lưu ý:** Ngay cả khi bạn ẩn các điểm ghim, kịch bản **vẫn tự động click hoàn toàn bình thường** và chính xác theo tọa độ đã lưu!

---

## 🔽 7. Nút Thu Gọn Kịch Bản (Collapse / Expand Card)

Khi bạn có nhiều kịch bản với nhiều điểm click, giao diện có thể trở nên dài và chiếm diện tích.

- **Cách sử dụng:**
  - Trên mỗi thẻ kịch bản, ở góc trên bên trái (cạnh nút gạt Bật/Tắt), có nút mũi tên **`▼`**.
  - Bấm nút **`▼`** để **thu gọn kịch bản**:
    - Phần cấu hình thời gian nghỉ và danh sách điểm click dài sẽ được ẩn đi.
    - Nút mũi tên chuyển sang xoay sang phải `▶`.
    - Thẻ hiển thị tóm tắt ngắn gọn: `(X điểm • Chờ Y phút • ➔ Chuyển kịch bản...)`.
  - Bấm lại nút mũi tên để **mở rộng đầy đủ** khi bạn muốn cấu hình hoặc chỉnh sửa điểm.
  - **Trạng thái thu gọn/mở rộng được tự động lưu lại vĩnh viễn**, khi mở lại trình duyệt các thẻ vẫn giữ nguyên trạng thái bạn đã chọn.

---

## 🔁 8. Thiết Lập Chuỗi Kịch Bản Nối Tiếp Tuần Hoàn (Chaining Workflow)

### Tình huống thực tế:
Bạn có một ứng dụng/game:
1. Chạy **Kịch bản 1** (Thực hiện chuỗi click để bắt đầu một tiến trình hoặc nhiệm vụ).
2. Tiến trình của app mất **1 tiếng** mới hoàn thành.
3. Sau 1 tiếng hoàn thành, cần chạy **Kịch bản 2** (Click để nhận thưởng hoặc bấm nút "Hoàn thành").
4. Sau khi Kịch bản 2 nhận thưởng xong, chỉ cần **5 giây sau** là tự động quay lại chạy **Kịch bản 1** để bắt đầu lượt mới.
5. Vòng lặp này tự động lặp đi lặp lại liên tục không cần người canh chừng.

### Cách thiết lập cực kỳ đơn giản với Khung Cài Đặt Chuỗi Tuần Hoàn 2 Chiều:

Bạn **chỉ cần vào Kịch bản 1 (ví dụ: `thám hiểm BĐ`)**, tại mục **`🔄 Chế độ lặp:`** chọn **`➔ Kịch bản 2 (ví dụ: KT Thám Hiểm)`**:

Ngay lập tức, hệ thống sẽ mở ra **Khung Cài Đặt Chuỗi Tuần Hoàn 2 Chiều (A ⇄ B)** cho phép bạn nhập cả 2 thời gian delay ngay tại chỗ:

1. **Dòng 1: [thám hiểm BĐ] ➔ [KT Thám Hiểm]:**
   - Nhập thời gian chờ: **`1`** **`Giờ`**.
   - *(Nghĩa là: Sau khi chạy xong thám hiểm BĐ, kịch bản sẽ nghỉ 1 tiếng rồi kích hoạt KT Thám Hiểm)*.
2. **Dòng 2: [KT Thám Hiểm] ➔ [thám hiểm BĐ]:**
   - Nhập thời gian chờ: **`5`** **`Giây`**.
   - *(Nghĩa là: Sau khi KT Thám Hiểm chạy xong, kịch bản sẽ nghỉ 5 giây rồi lặp lại thám hiểm BĐ)*.
3. **Xem trước chu trình:**
   - Hệ thống hiển thị trực quan: `⚡ Chu trình: [thám hiểm BĐ] ➔ chờ 1 giờ ➔ [KT Thám Hiểm] ➔ chờ 5 giây ➔ lặp lại [thám hiểm BĐ]...`
4. **Tự động đồng bộ 2 chiều:**
   - Khi bạn nhập ở Kịch bản 1, hệ thống **tự động liên kết và cập nhật luôn vào Kịch bản 2**, bạn **không cần phải tự tay chuyển qua Kịch bản 2 để cài đặt thủ công** nữa!
5. **Bấm phím `F4` (hoặc ▶️ Chạy Tất Cả):**
   - Kịch bản 1 sẽ chạy ngay lập tức.
   - Kịch bản 2 sẽ chờ đúng 1 tiếng sau khi Kịch bản 1 xong mới chạy.
   - Hết Kịch bản 2, 5 giây sau Kịch bản 1 sẽ chạy lại, lặp lại tuần hoàn vô tận!

---

## 🎯 9. Có 3 Kịch Bản: 2 Kịch Bản Nối Tiếp & 1 Kịch Bản Chạy Riêng Biệt

Nếu bạn có **3 kịch bản**, trong đó bạn muốn:
- **Kịch bản 1 & Kịch bản 2:** Chạy tuần hoàn theo chuỗi nối tiếp nhau (Kịch bản 1 chạy ➔ nghỉ 1 tiếng ➔ Kịch bản 2 chạy ➔ nghỉ 5s ➔ Kịch bản 1).
- **Kịch bản 3:** Chạy hoàn toàn **riêng biệt**, không bị cuốn vào chuỗi của 2 kịch bản kia.

Bạn có **2 cách sử dụng cho Kịch bản 3** tùy theo nhu cầu của bạn:

---

### 👉 CÁCH 1: Kịch bản 3 chạy RIÊNG BIỆT TỰ ĐỘNG SONG SONG (Theo chu kỳ độc lập)
*(Dùng khi Kịch bản 3 cần tự động lặp lại theo thời gian riêng của nó, ví dụ cứ mỗi 10 phút tự chạy 1 lần song song với chuỗi 1h <-> 5s của 2 kịch bản kia)*

1. **Kịch bản 1:**
   - Nghỉ sau khi chạy: `1` `Giờ`.
   - `🔄 Chạy xong, chuyển sang:` **`➔ Kịch bản 2`**.
   - Công tắc: **BẬT (ON)**.

2. **Kịch bản 2:**
   - Nghỉ sau khi chạy: `5` `Giây`.
   - `🔄 Chạy xong, chuyển sang:` **`➔ Kịch bản 1`**.
   - Công tắc: **BẬT (ON)**.

3. **Kịch bản 3 (Chạy riêng biệt):**
   - Nghỉ sau khi chạy: Nhập số phút/giây riêng (ví dụ: `10` `Phút`).
   - `🔄 Chạy xong, chuyển sang:` Chọn **`🔁 Tự lặp lại chính nó`**.
   - Công tắc: **BẬT (ON)**.

4. **Bấm `F4` (hoặc ▶️ Chạy Tất Cả):**
   - Kịch bản 1 và Kịch bản 3 sẽ chạy ngay khi bấm `F4`.
   - Kịch bản 2 sẽ ở trạng thái `⏳ Đợi chuỗi...` (chờ Kịch bản 1 xong mới kích hoạt).
   - Kịch bản 1 và Kịch bản 2 sẽ chuyền bóng cho nhau tuần hoàn: `1 Giờ` ➔ `5 Giây`.
   - Kịch bản 3 tự động lặp lại độc lập cứ mỗi `10 Phút` một lần.
   - Nhờ có **Bộ Khóa Chuột Mutex**, nếu Kịch bản 3 đến giờ trùng lúc Kịch bản 1 hoặc 2 đang click, nó sẽ tự động xếp hàng và click an toàn không bị gián đoạn!

---

### 👉 CÁCH 2: Kịch bản 3 chạy RIÊNG BIỆT BẰNG NÚT BẤM (Thủ công theo ý muốn)
*(Dùng khi Kịch bản 3 chỉ chạy khi bạn muốn bấm kích hoạt riêng, không muốn nó tự động chạy ngầm)*

1. **Kịch bản 1 & 2:** Bật công tắc **BẬT (ON)** và cài đặt nối tiếp nhau như bình thường.
2. **Kịch bản 3:**
   - Gạt công tắc sang **TẮT (OFF)** (hoặc tại mục chuyển sang chọn `⏹️ Dừng lại (Không lặp)`).
   - Khi công tắc tắt, Kịch bản 3 **sẽ không bị chạy tự động** khi bạn bấm `F4` hay "Chạy Tất Cả".
3. **Khi nào bạn muốn chạy Kịch bản 3:**
   - Trên thẻ của Kịch bản 3, bấm trực tiếp nút **`▶️ Chạy riêng`** màu xanh (nút này hiển thị ngay cả khi bạn thu gọn thẻ!).
   - Hoặc mở rộng thẻ và bấm nút **`▶️ Chạy ngay`** trong danh sách điểm.
   - **Kịch bản 3 sẽ lập tức thực thi ngay** các điểm click của nó một cách độc lập mà không hề làm gián đoạn hay ảnh hưởng đến đồng hồ đếm ngược của Kịch bản 1 và Kịch bản 2!

---

## 📊 10. Menu Xem Bộ Đếm Số Lượt Đã Chạy Của Từng Kịch Bản

Phiên bản mới bổ sung hệ thống **Bộ đếm số lượt thực thi (Run Counter)** giúp bạn nắm bắt chính xác mỗi kịch bản đã chạy thành công bao nhiêu lần:

### 10.1. Xem Số Lượt Chạy Trực Tiếp Trên Thẻ Kịch Bản
- Trên tiêu đề của mỗi thẻ kịch bản đều có huy hiệu: **`🎯 X lượt`** (ví dụ: `🎯 14 lượt`).
- Huy hiệu này **hiển thị ở cả 2 trạng thái: mở rộng và thu gọn (`▼`)**, giúp bạn dễ dàng theo dõi ngay cả khi thu nhỏ giao diện.
- Khi một kịch bản hoàn thành tất cả các điểm click, bộ đếm sẽ tự động nhảy lên `+1` ngay tức thì.

### 10.2. Mở Menu Thống Kê & Bộ Đếm Chi Tiết
Bạn có thể mở giao diện thống kê chuyên sâu bằng 2 cách:
1. **Bấm vào Tab:** Chọn tab **`📊 Bộ Đếm Số Lượt`** ở thanh menu trên cùng của tiện ích.
2. **Bấm Icon Nhanh:** Bấm biểu tượng **`📊`** trên thanh tiêu đề góc trên bên phải.

### 10.3. Các Thông Tin Được Hiển Thị Trong Menu Bộ Đếm
- **Tổng số lượt hoàn tất:** Tổng hợp tất cả các lượt click đã chạy thành công của toàn bộ các kịch bản.
- **Bảng xếp hạng kịch bản:** Tự động sắp xếp các kịch bản có số lượt chạy nhiều nhất lên đầu trang (Hạng 1, 2, 3...).
- **Chi tiết từng kịch bản:**
  - Tên kịch bản kèm trạng thái `[BẬT]` hoặc `[TẮT]`.
  - Nếu kịch bản đang thực thi chuột sẽ có nhãn `⚡ Đang chạy`.
  - Số lượng điểm click và mức độ ưu tiên.
  - **Thời gian chạy lần cuối:** Hiển thị chính xác giờ, phút, giây và ngày tháng (ví dụ: `Lần cuối: 15:40:22 (18/09)`).
  - Khung số lượt nổi bật màu xanh lá: `[ 14 lượt ]`.

### 10.4. Đặt Lại Bộ Đếm (Reset)
- **Reset từng kịch bản:** Bấm nút **`🔄 Reset`** trên dòng kịch bản đó để đặt bộ đếm của riêng kịch bản đó về `0`.
- **Reset tất cả:** Bấm nút **`🔄 Đặt lại tất cả về 0`** ở trên đầu để xóa bộ đếm của toàn bộ danh sách kịch bản về `0` cùng lúc.

### 10.5. Lưu Trữ Bộ Đếm Vĩnh Viễn
- Mọi dữ liệu số lượt chạy (`runCount`) và mốc thời gian lần cuối (`lastRunAt`) đều được **tự động lưu vào bộ nhớ cục bộ `chrome.storage.local`**.
- Cho dù bạn **tắt trình duyệt, tắt máy tính, khởi động lại laptop**, khi mở lại số lượt đã chạy vẫn được bảo toàn nguyên vẹn 100%!

---

## ⏱️ 11. Hai Chế Độ Tính Thời Gian Chờ: "Ngay Khi Bắt Đầu" vs "Sau Khi Kết Thúc"

Mỗi kịch bản hiện tại đều có thể linh hoạt lựa chọn **1 trong 2 chế độ tính giờ đếm ngược** (áp dụng cho cả chế độ tự lặp lại và chuỗi tuần hoàn chuyển tiếp sang kịch bản khác):

### 11.1. Chế Độ 1: ⚡ "Ngay Khi Bắt Đầu" (`from_start`)
- **Cách hoạt động:** Đồng hồ đếm ngược thời gian chờ **bắt đầu chạy ngay từ khoảnh khắc kịch bản vừa bắt đầu click điểm đầu tiên**.
- **Ý nghĩa thực tế:**
  - Giúp bạn cố định chính xác chu kỳ kích hoạt.
  - *Ví dụ:* Bạn đặt lặp mỗi **10 giây**, kịch bản mất **3 giây** để click hết các điểm:
    - Ở giây thứ `0`: Kịch bản bắt đầu click, đồng hồ hẹn giờ lập tức đếm ngược từ `10s`.
    - Ở giây thứ `3`: Kịch bản click xong, lúc này đồng hồ chỉ còn lại `7 giây`.
    - Đúng giây thứ `10`, lượt click kế tiếp sẽ chạy ngay!
  - Trong chuỗi tuần hoàn (A ➔ B): Nếu A đặt "Ngay khi bắt đầu", khi A vừa bấm nút bắt đầu thì đồng hồ chờ B đã đếm ngược ngay lập tức mà không cần chờ A click xong!

### 11.2. Chế Độ 2: ⏱️ "Sau Khi Kết Thúc" (`after_finish`)
- **Cách hoạt động:** Kịch bản phải click xong toàn bộ các điểm từ đầu đến cuối, sau đó mới **bắt đầu tính thời gian nghỉ ngơi**.
- **Ý nghĩa thực tế:**
  - Phù hợp cho các tiến trình mà thời gian chạy click không cố định hoặc cần một khoảng nghỉ trọn vẹn sau khi thao tác xong.
  - *Ví dụ:* Bạn đặt nghỉ **10 giây**, kịch bản mất **3 giây** để click:
    - Ở giây thứ `0`: Kịch bản click điểm 1, điểm 2, điểm 3.
    - Ở giây thứ `3`: Kịch bản hoàn tất tất cả các điểm, lúc này đồng hồ mới bắt đầu đếm ngược đủ `10 giây`.
    - Ở giây thứ `13` (3s + 10s), lượt click mới bắt đầu chạy.

### 11.3. Cách Chuyển Đổi Chế Độ
- **Khi tự lặp lại chính nó:** Trong thẻ kịch bản, tại dòng *"⏱️ Chờ: [ ... ] Giây"*, bấm menu thả xuống **"Tính giờ:"** và chọn giữa **`⚡ Ngay khi bắt đầu`** hoặc **`⏱️ Sau khi kết thúc`**.
- **Khi nối tiếp 2 kịch bản (A ⇄ B):** Bạn có thể cài đặt chế độ tính giờ riêng cho từng chiều:
  - Chiều 1 [A ➔ B]: Chọn tính giờ của [A] là `Ngay khi bắt đầu` hay `Sau khi kết thúc`.
  - Chiều 2 [B ➔ A]: Chọn tính giờ của [B] là `Ngay khi bắt đầu` hay `Sau khi kết thúc`.
- Toàn bộ thiết lập này được lưu tự động vĩnh viễn và hiển thị trực quan trong dòng tóm tắt chu trình `⚡ Chu trình: [A] ➔ chờ ... ➔ [B]...`.

---

## ⌨️ 12. Phím Tắt Khởi Động Tiện Ích: Không Tự Ý Xuất Hiện Cùng Web

Phiên bản mới bổ sung cơ chế **Khởi động theo yêu cầu (On-Demand Activation)**, giải quyết triệt để sự bất tiện khi thanh công cụ Auto Clicker luôn tự động mở mỗi khi bạn vào bất kỳ trang web nào:

### 12.1. Cách Hoạt Động Mặc Định Mới
- Khi bạn mở trang web hoặc F5 tải lại trang: **Thanh Auto Clicker và các điểm ghim 📍 được ẩn hoàn toàn 100%**.
- Giao diện trang web của bạn luôn sạch sẽ, gọn gàng, không bị che khuất tầm nhìn.
- Tiện ích chỉ xuất hiện khi **bạn thực sự muốn sử dụng nó**.

### 12.2. Các Cách Khởi Động Auto Clicker
1. **Dùng Phím Tắt (Khuyên Dùng):**
   - Nhấn tổ hợp phím **`Alt + A`** trên bàn phím.
   - Thanh công cụ Auto Clicker sẽ ngay lập tức xuất hiện nổi trên trang web.
   - Nhấn lại **`Alt + A`** bất cứ lúc nào để ẩn thanh công cụ đi.
2. **Dùng Phím Chức Năng `F2` hoặc `F4`:**
   - Khi đang ẩn, nếu bạn bấm **`F2`** (Ghi điểm) hoặc **`F4`** (Chạy kịch bản), thanh công cụ sẽ tự động xuất hiện để bạn theo dõi trạng thái.
3. **Bấm Nút Trên Icon Tiện Ích (Chrome Toolbar):**
   - Nhấp vào biểu tượng tiện ích Auto Clicker trên thanh công cụ góc trên bên phải trình duyệt Chrome.
   - Bấm nút to màu xanh lá: **`⚡ Bật / Ẩn Auto Clicker (Alt+A)`**.

### 12.3. Tùy Chỉnh Phím Tắt & Cài Đặt Hệ Thống (Tab ⚙️ Cài Đặt)
- Bấm vào tab **`⚙️ Cài Đặt`** trên thanh menu của tiện ích (hoặc biểu tượng bánh răng **`⚙️`** trên thanh tiêu đề).
- **Đổi phím tắt khởi động:** Nhấp chuột vào ô *"Phím Khởi Động / Bật-Ẩn"*, sau đó bấm tổ hợp phím bạn muốn (ví dụ: `F9`, `Ctrl+Shift+A`, `Alt+Z`...). Phím mới sẽ được lưu và áp dụng ngay lập tức!
- **Bật lại chế độ tự mở cùng web:** Nếu bạn muốn tiện ích luôn tự mở ngay khi vào web như trước đây, chỉ cần gạt công tắc *"Tự động mở cùng trang web"* sang **BẬT (ON)**.
- **Tùy chỉnh phím Ghi (`F2`) & phím Chạy (`F4`):** Có thể nhấp vào để đổi sang bất kỳ phím nào theo thói quen của bạn.
- **Thời gian giữ chạm (Touch Hold):** Tinh chỉnh độ trễ mili-giây cảm ứng cho CloudEmulator / Redfinger (mặc định 70ms).
- **Khôi phục mặc định:** Có nút **"🔄 Khôi phục mặc định"** để đưa toàn bộ phím tắt về ban đầu (`Alt+A`, `F2`, `F4`) chỉ với 1 click.

---

## 🎯 13. Hiển Thị Điểm Click Riêng Biệt Cho Từng Kịch Bản (Chống Trộn Lẫn Điểm)

Khi thiết lập nhiều kịch bản khác nhau trên cùng một trang web, việc hiển thị toàn bộ các điểm click của tất cả kịch bản cùng lúc sẽ gây rối mắt, khó quan sát và dễ nhầm lẫn điểm của kịch bản này với kịch bản khác.

Phiên bản mới bổ sung cơ chế **Hiển thị điểm độc quyền (Single-Script Point Visibility & Mutual Exclusivity)**:

### 13.1. Cơ Chế Hoạt Động
- **Chỉ hiển thị điểm của DUY NHẤT 1 kịch bản tại một thời điểm:**
  - Nếu bạn đang hiển thị các điểm của **Kịch bản A** mà bấm nút **`👁️ Hiện điểm`** ở **Kịch bản B**:
    ➔ Các điểm của **Kịch bản A** sẽ **tự động ẩn ngay lập tức**, và trên màn hình sẽ chỉ hiển thị các điểm click của **Kịch bản B**.
  - Nếu bạn bấm lại vào nút **`🕶️ Ẩn điểm`** của kịch bản đang hiển thị:
    ➔ Toàn bộ điểm click sẽ được ẩn đi để màn hình hoàn toàn sạch sẽ.
- **Vị trí nút bật/tắt hiển thị:**
  1. **Ở đầu thẻ kịch bản (Header):** Có nút **`👁️ Hiện điểm`** / **`🕶️ Ẩn điểm`** ngay cạnh nút *"▶️ Chạy riêng"*. Dù bạn đang thu gọn kịch bản lại thì vẫn có thể bật/tắt hiển thị điểm dễ dàng.
  2. **Trong thanh công cụ quản lý điểm:** Có nút **`👁️ Hiện điểm`** / **`🕶️ Đang hiện`** ngay cạnh nút *"🔴 Ghi điểm"*.
- **Nhận diện trực quan nổi bật:**
  - Kịch bản đang hiển thị điểm trên màn hình sẽ có **viền phát sáng màu xanh ngọc bích**, nút bấm chuyển sang màu xanh lá cây `🕶️ Ẩn điểm` / `🕶️ Đang hiện`.
  - Trên màn hình, khi di chuột vào từng vòng tròn ghim số 📍, tooltip sẽ hiển thị rõ ràng: `[Tên kịch bản] Điểm #1 (x, y) - Kéo để đổi vị trí`.
- **Tự động lưu vĩnh viễn:** Trình duyệt ghi nhớ kịch bản bạn đang hiển thị điểm vào `chrome.storage.local`. Khi F5 tải lại trang hoặc mở lại trình duyệt, đúng kịch bản đó sẽ tiếp tục được giữ nguyên trạng thái.



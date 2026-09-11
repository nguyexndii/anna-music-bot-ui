# Anna Music Web UI

Giao diện Web Player và Live Dashboard điều khiển bot phát nhạc Discord thời gian thực, xây dựng trên nền tảng React 18, Vite và Tailwind CSS.

---

## Tính năng Nổi bật

### 1. Trải nghiệm Nghe nhạc & Giao diện Hiện đại
- **Hero Player Deck & Vinyl Animation**: Đĩa than quay đồng bộ theo trạng thái phát nhạc, hiệu ứng sóng âm thanh (Equalizer Visualizer) và thanh tiến trình Seekbar chính xác.
- **Dynamic Ambient Background**: Tự động trích xuất tông màu từ ảnh bìa bài hát đang phát và tạo hiệu ứng nền mờ chuyển động mượt mà.
- **Fullscreen Karaoke Stage Mode**: Chế độ sân khấu toàn màn hình với lời bài hát đồng bộ chạy từng dòng theo thời gian thực (hỗ trợ điều chỉnh độ trễ thủ công).

### 2. Chế độ Lofi 24/7 Hai chiều
- **Điều khiển Trực quan Một chạm**: Nút điều khiển thông minh tự động đổi nhãn theo trạng thái:
  - `VỀ NHẠC LOFI`: Chuyển sang danh sách lofi không lời khi muốn thư giãn, giữ nguyên hàng đợi bài hát cá nhân.
  - `TIẾP TỤC PHÁT NHẠC`: Quay trở lại phát các bài hát trong hàng đợi của người dùng.
  - `PHÒNG TRỐNG (24/7)`: Hiển thị trạng thái khi không có người trong voice chat, tránh gửi yêu cầu thừa tới backend.

### 3. Trải nghiệm Tìm kiếm Tức thời & Chống Quá tải
- **Live Search Thông minh (As-you-type with Debounce & AbortController)**: Tự động tìm kiếm kết quả ngay khi người dùng đang gõ tên bài hát (sau 350ms) mà không bắt buộc phải nhấn Enter, tự hủy truy vấn cũ khi gõ tiếp để tối ưu đường truyền.
- **Khóa nút Chống Spam (Anti-spam Action Throttle)**: Tự động khóa nút kèm biểu tượng xoay tải khi gửi lệnh (skip, previous, seek, play), ngăn chặn tình trạng bấm liên tục gây nghẽn tiến trình Discord.

### 4. Tối ưu Hiệu năng & Mạng (Page Visibility API)
- **Tự động Giảm Tần suất Polling khi Ẩn Tab**: Khi người dùng chuyển sang tab khác hoặc thu nhỏ trình duyệt (`document.hidden`), chu kỳ polling tự động giãn từ 2.5 giây lên 12 giây, tiết kiệm hơn 80% tài nguyên mạng.
- **Tải nhanh Khám phá (Instant Explore Load)**: Gọi API với tham số `?full=1` ngay khi tải trang ban đầu, giúp tab Khám Phá hiển thị dữ liệu ngay lập tức với độ trễ 0 giây.

### 5. Xác thực Một chạm Bảo mật (Magic Token)
- Sử dụng chữ ký **HMAC SHA-256** được cấp qua lệnh `/web` trong Discord.
- Không yêu cầu đăng nhập OAuth2 phức tạp, tự động nhận diện danh tính (Avatar, Display Name) của thành viên khi thêm bài vào hàng đợi.

---

## Cấu trúc Mã nguồn

```text
anna-music-bot-ui/
├── public/                 # Tài nguyên tĩnh (favicon, logo, icons)
├── src/
│   ├── components/
│   │   ├── BottomMiniPlayer.jsx       # Thanh điều khiển thu nhỏ cố định dưới đáy
│   │   ├── DynamicAmbientBackground.jsx# Nền mờ đổi màu theo ảnh bìa bài hát
│   │   ├── HeroPlayer.jsx             # Khu vực phát nhạc chính (Đĩa than, Seekbar, Controls)
│   │   ├── KaraokeFullscreenModal.jsx # Chế độ Karaoke toàn màn hình
│   │   ├── LiveSearch.jsx             # Khung tìm kiếm bài hát
│   │   ├── QueueManager.jsx           # Quản lý danh sách hàng đợi phát nhạc
│   │   ├── SettingsTab.jsx            # Bảng cài đặt máy chủ dành cho Quản trị viên
│   │   ├── SyncedLyrics.jsx           # Hiển thị lời bài hát đồng bộ
│   │   └── Toast.jsx                  # Thông báo trạng thái giao diện kính mờ
│   ├── App.jsx                        # Component chính quản lý state và polling
│   ├── index.css                      # Thiết lập Tailwind CSS và hiệu ứng animation
│   └── main.jsx                       # Điểm gắn kết React DOM
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## Yêu cầu Hệ thống & Cài đặt

- **Node.js**: Phiên bản 18.x trở lên.
- **Package Manager**: npm hoặc yarn.

### 1. Cài đặt thư viện phụ thuộc
```bash
npm install
```

### 2. Chạy ở Môi trường Phát triển (Dev)
```bash
npm run dev
```
Trình duyệt sẽ mở tại `http://localhost:5173`.

### 3. Đóng gói cho Production (Build)
```bash
npm run build
```
Bản build tĩnh sẽ được tạo tại thư mục `dist/`.

Để cập nhật giao diện mới nhất cho bot backend:
```bash
# Windows PowerShell:
Copy-Item -Path dist\* -Destination ..\anna-music-bot\public\ -Recurse -Force
```

---

## Công nghệ Sử dụng

- **Core**: React 18, Vite
- **Styling**: Tailwind CSS, Glassmorphism UI
- **Icons**: Lucide React
- **Hosting**: Cloudflare Pages / Static Hosting tích hợp Express Server backend

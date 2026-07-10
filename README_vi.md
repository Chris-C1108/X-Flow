# X-Flow (Trình phát video dạng TikTok cho bảng xếp hạng Twitter v6 Pro)

<p align="center">
  <img src="https://img.shields.io/badge/Version-6.2.2-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Tampermonkey-red.svg?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/License-Apache--2.0-green.svg?style=flat-square" alt="License">
</p>

**Bạn vẫn đang phải chịu đựng các trang web xếp hạng Twitter đầy rẫy các lượt chuyển hướng nhiều cấp, quảng cáo pop-up bay khắp màn hình và tốc độ đệm video cực kỳ chậm?**

X-Flow là một **Userscript (Tampermonkey)** được tùy chỉnh riêng cho các trang web gương như `truvaze.com`, `pektino.com` và `x-ero-anime.com`.

Nó kiểm soát trang gốc ngay lập tức từ khi tải trang, **chặn hoàn toàn tất cả quảng cáo, cửa sổ bật lên (pop-up) và các chuyển hướng độc hại, trích xuất luồng video trực tiếp và đóng gói nó thành một trình phát video toàn màn hình dọc dạng TikTok cực kỳ mượt mà**.

Không chuyển hướng trang, không quảng cáo, mở ra là lướt. Trải nghiệm xem video Twitter tinh khiết nhất dành cho bạn!

---

## 🌟 Giá trị cốt lõi & Tính năng nổi bật (Why X-Flow?)

*   **🚫 Chặn hoàn toàn quảng cáo và chuyển hướng**: Chặn mạnh mẽ tất cả các quảng cáo pop-up, chuyển hướng ngầm và các tập lệnh rác ở cấp độ trình duyệt, trả lại cho bạn môi trường lướt video 100% sạch sẽ và an toàn.
*   **🎬 Lướt video cực nhanh dạng TikTok**: Nhấp vào bất kỳ thẻ video nào trên màn hình chính để vào trình phát toàn màn hình dọc ngay lập tức. Hỗ trợ con lăn chuột, các phím mũi tên (↑/↓) hoặc lướt màn hình điện thoại để chuyển đổi video liên tục.
*   **💾 Ghi nhớ tiến trình thông minh (Xem tiếp)**: Tự động ghi nhớ tiến trình xem của bạn cho từng video (chính xác đến từng giây). Khi chuyển lại, trình phát sẽ tự động phát tiếp từ chỗ dừng, thanh tiến trình và thời gian sẽ được vẽ trước khi đệm để tránh hiện tượng nhấp nháy giao diện.
*   **⚡ Lướt ngược lại 0s không cần chờ đệm**: Sử dụng bộ nhớ đệm thông minh dưới nền, ngay cả khi bạn chuyển đổi qua lại giữa các video liền kề (ví dụ: xem xong video B rồi vuốt ngược về video A), bạn cũng không cần phải chờ đệm lại từ mạng.
*   **🚀 Tăng tốc đệm video gấp 3 lần**: Tự động vô hiệu hóa các proxy mạng nền của trang gốc làm giới hạn tốc độ tải xuống video, kết hợp với kỹ thuật tiền kết nối TCP/SSL nền để tăng tốc độ đệm video lên 300%.
*   **📂 Bảng tác giả & Tải hàng loạt**: Vuốt sang trái để mở trang cá nhân của người sáng tạo, hỗ trợ "Chọn tất cả" để sao chép hàng loạt liên kết trực tiếp CDN video không có logo, giúp bạn dễ dàng nhập vào trình quản lý tải xuống của mình.
*   **📱 Cử chỉ di động mượt mà**: Tối ưu hóa các cử chỉ cho trình duyệt như Safari trên điện thoại, giải quyết triệt để lỗi "nhấp lần đầu vào thẻ chỉ phóng to (hover), nhấp lần thứ hai mới phát video" của WebKit, giúp phản hồi nhấp chuột không có độ trễ.

---

## 🎮 Các thao tác thường dùng (Controls)

| Thao tác | Chức năng tương ứng |
| :--- | :--- |
| **🖱️ Cuộn chuột / ⌨️ Phím ↑/↓** | Chuyển đổi video trước / sau |
| **⌨️ Phím Space / Enter / 🖱️ Nhấp vào video** | Phát / Tạm dừng |
| **👆 Vuốt lên / xuống (Điện thoại)** | Chuyển sang video tiếp theo / trước đó |
| **👆 Vuốt sang trái (Điện thoại)** | Mở bảng tác giả và xuất liên kết tải xuống hàng loạt |
| **👆 Vuốt sang phải / ⌨️ Esc / Nút ❌** | Thoát khỏi trình phát toàn màn hình |
| **⚡ Điều khiển tốc độ phát** | Hỗ trợ điều khiển tốc độ phát từ 0.5× đến 2.0× |
| **🔘 Bộ lọc chưa xem** | Lọc bỏ các video đã xem, chỉ giữ lại nội dung mới |

---

## 🛠️ Hướng dẫn cài đặt (Installation)

### Bước 1: Cài đặt tiện ích mở rộng Tampermonkey
Đảm bảo bạn đã cài đặt tiện ích mở rộng **Tampermonkey** trên trình duyệt của mình: [https://www.tampermonkey.net/](https://www.tampermonkey.net/)

### Bước 2: Cài đặt tập lệnh X-Flow
Chọn một trong hai địa chỉ cài đặt dưới đây:
*   **Nền tảng Greasy Fork**: [https://sleazyfork.org/zh-CN/scripts/562631](https://sleazyfork.org/zh-CN/scripts/562631)
*   **Liên kết dự phòng (OpenUserJS)**: [https://openuserjs.org/scripts/loadingi](https://openuserjs.org/scripts/loadingi)

Sau khi cài đặt, truy cập trực tiếp vào các tên miền được hỗ trợ bên dưới, tập lệnh sẽ tự động kích hoạt và tiếp quản trang web:
*   `truvaze.com`
*   `pektino.com`
*   `x-ero-anime.com`

---

## 💻 Phát triển và biên dịch cục bộ (Development)

Nếu bạn muốn tự chỉnh sửa hoặc biên dịch dự án này, hãy làm theo các bước sau:

1. **Clone hoặc tải dự án về máy**
2. **Cài đặt các gói phụ thuộc**
   ```bash
   npm install
   ```
3. **Khởi động máy chủ phát triển cục bộ (Hỗ trợ tải lại nóng HMR)**
   ```bash
   npm run dev
   ```
   Mở hoặc nhập đường dẫn `.user.js` hiển thị trong terminal của bạn vào Tampermonkey. Trình duyệt sẽ tự động tải lại mỗi khi bạn chỉnh sửa mã nguồn.
4. **Biên dịch bản sản xuất**
   ```bash
   npm run build
   ```
   Sau khi hoàn tất, tập lệnh phát hành cuối cùng sẽ được xuất ra thư mục `dist/userscript/x-flow.user.js`.

---

## 📝 Lịch sử cập nhật (Changelog)

*   **v6.2.2**: Tối ưu hóa các thông số cấu hình cho các bộ điều hợp máy chủ mới nhất.
*   **v6.2.1**: Thêm tính năng lưu trữ tiến trình xem (LRU + TTL) & phát tiếp. Nâng cấp nhóm node lên 5 để loại bỏ hiện tượng đệm khi lướt ngược lại. Sửa lỗi cử chỉ trên iOS Safari.
*   **v6.2.0**: Tương thích hoàn toàn với API Next.js REST mới của `pektino.com`. Rút ngắn thời gian tải khung xương (skeleton) xuống dưới 5ms. Vô hiệu hóa Service Worker của nguồn trang gốc.
*   **v6.1.0 ~ v6.1.1**: Thêm bảng điều khiển tác giả, lựa chọn hàng loạt và sao chép liên kết trực tiếp. Sửa lỗi reset trang thành `about:blank` trên thiết bị di động.
*   **v6.0.0**: Hỗ trợ tải lười trang chi tiết `twihub.net` và bỏ qua xác minh bảo mật Cloudflare.

---
**Author**: Chris_C  
**License**: Apache-2.0

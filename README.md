# 🚌 BusSnooze - Ứng dụng Báo thức Điểm dừng Xe buýt

**BusSnooze** là một ứng dụng Web (PWA) giúp hành khách đi xe buýt không còn lo lắng về việc ngủ quên và đi quá điểm dừng. Ứng dụng sẽ theo dõi vị trí của bạn thông qua GPS và kích hoạt báo thức ngay khi bạn đi vào bán kính đã thiết lập gần điểm đến.

![App Screenshot](https://via.placeholder.com/400x800?text=BusSnooze+Screenshot) 

## ✨ Tính năng nổi bật

- **📍 Định vị GPS thời gian thực**: Hiển thị vị trí hiện tại với mũi tên chỉ hướng chính xác như Google Maps.
- **🔍 Tìm kiếm thông minh**: Tìm kiếm địa chỉ/điểm dừng nhanh chóng với tính năng tự động gợi ý ngay khi gõ.
- **🔔 Báo thức Proximity**: Tự động đổ chuông và rung khi bạn ở gần điểm đến trong bán kính từ 100m - 2000m.
- **📌 Lưu địa điểm yêu thích**: Lưu lại các điểm dừng thường xuyên (Nhà, Cơ quan, Trường học...) để kích hoạt báo thức chỉ với 1 chạm.
- **🛡️ Chế độ Chống ngủ quên (Wake Lock)**: Ngăn thiết bị tắt màn hình để đảm bảo GPS luôn hoạt động ổn định trong suốt chuyến đi.
- **💾 Ghi nhớ cài đặt**: Tự động lưu lại bán kính báo thức và các địa điểm đã lưu của từng người dùng.
- **📱 Tối ưu hóa di động**: Thiết kế giao diện hiện đại, dễ thao tác bằng một tay, hỗ trợ cài đặt như ứng dụng chính thức (PWA).

## 🚀 Công nghệ sử dụng

- **React 18** & **Vite**: Nền tảng phát triển nhanh và tối ưu.
- **Tailwind CSS**: Giao diện hiện đại, responsive.
- **Leaflet & React-Leaflet**: Xử lý bản đổ và tương tác vị trí.
- **Lucide React**: Hệ thống icon đồng nhất.
- **Motion (Framer Motion)**: Hiệu ứng chuyển động mượt mà.
- **Web Audio API**: Xử lý âm thanh báo thức.

## 🛠️ Cài đặt và Phát triển

1. **Clone repository:**
   ```bash
   git clone https://github.com/TomDevX/BusSnooze.git
   cd BusSnooze
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Chạy ở môi trường local:**
   ```bash
   npm run dev
   ```

4. **Build bản production:**
   ```bash
   npm run build
   ```

## 🌐 Lưu ý khi đẩy lên GitHub Pages

Để ứng dụng hoạt động chính xác trên GitHub Pages, hãy lưu ý:

1. **Vite Base Path**: File `vite.config.ts` đã được cài đặt `base: './'` để hỗ trợ các đường dẫn tương đối.
2. **HTTPS**: GitHub Pages cung cấp HTTPS mặc định. Đây là điều kiện **bắt buộc** để tính năng **Vị trí (GPS)** và **Wake Lock** (chống tắt màn hình) hoạt động.
3. **Cài đặt GitHub Actions**: Bạn nên sử dụng GitHub Actions để tự động build và deploy từ nhánh `main` lên nhánh `gh-pages`.

### File mẫu `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 📝 Lưu ý sử dụng (Dành cho người dùng)

Do chính sách bảo mật của trình duyệt, để ứng dụng hoạt động tốt nhất:
1. Hãy **Thêm vào màn hình chính** (Add to Home Screen) để có hiệu năng ổn định nhất.
2. Kích hoạt tính năng **"Chống ngủ quên"** trong phần cài đặt của App.
3. Luôn cho phép quyền truy cập **Vị trí (Location)** ở mức "Trong khi sử dụng" hoặc "Luôn luôn".

## 🤝 Đóng góp

Mọi đóng góp (Pull Request) hoặc báo lỗi (Issue) đều được hoan nghênh.

---
Made by [TomDev](https://github.com/TomDevX) and AI with ❤️🔥

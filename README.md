# 🚌 BusSnooze - Bus Stop Proximity Alarm App

**BusSnooze** is a Progressive Web App (PWA) that helps bus passengers avoid missing their stops. The app tracks your location via GPS and triggers an alarm as soon as you enter a pre-set radius near your destination.

![App Screenshot](https://via.placeholder.com/400x800?text=BusSnooze+Screenshot) 

## ✨ Key Features

- **📍 Real-time GPS Tracking**: Shows your current location with a directional arrow.
- **🔍 Smart Search**: Quickly find addresses/bus stops with auto-suggestions.
- **🔔 Proximity Alarm**: Automatically rings and vibrates when you are near your destination (100m - 2000m radius).
- **📌 Saved Locations**: Save your frequent stops (Home, Work, School...) to activate alarms with a single tap.
- **🛡️ Anti-Sleep Mode (Wake Lock)**: Prevents the device from turning off the screen to ensure stable GPS tracking throughout the journey.
- **💾 Persistent Settings**: Automatically saves your alarm radius and pinned locations.
- **📱 Mobile Optimized**: Modern UI designed for one-handed use, can be installed as a PWA.

## 🚀 Technologies Used

- **React 18** & **Vite**: Fast and optimized development platform.
- **Tailwind CSS**: Modern, responsive styling.
- **Leaflet & React-Leaflet**: Map rendering and location interaction.
- **Lucide React**: Consistent iconography.
- **Motion (Framer Motion)**: Smooth animations.
- **Web Audio API**: Browser-based alarm sound synthesis.

## 🛠️ Installation and Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YourUsername/BusSnooze.git
   cd BusSnooze
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🌐 Deploying to GitHub Pages

To make the app work correctly on GitHub Pages, follow these steps:

1. **Vite Base Path**: In `vite.config.ts`, check that `base: './'` is set.
2. **Settings**: Go to your GitHub repository -> **Settings** -> **Pages**.
3. **Build and Deployment**: Select **GitHub Actions** as the Source.
4. **Workflow**: Create a file at `.github/workflows/deploy.yml` with the content below.

### GitHub Actions Workflow (`.github/workflows/deploy.yml`):
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

## 📝 Important Notes for Users

Due to browser security policies:
1. **Add to Home Screen**: For the most stable performance, please use the "Add to Home Screen" feature on your mobile browser.
2. **Stay Awake**: Enable the **"Anti-Sleep Mode"** in the app settings to keep GPS active while the screen is on (but dimmed).
3. **GPS Permissions**: Ensure that location permissions are set to "While Using" or "Always".

## 🤝 Contributing

Contributions (Pull Requests) and bug reports (Issues) are welcome.

---
Made by [TomDev](https://github.com/TomDevX) and AI with ❤️🔥

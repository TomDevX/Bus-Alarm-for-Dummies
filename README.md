# 🚌 BusSnooze - Bus Stop Proximity Alarm App

**BusSnooze** is a Progressive Web App (PWA) that helps bus passengers avoid missing their stops. The app tracks your location via GPS and triggers an alarm as soon as you enter a pre-set radius near your destination.

<img width="1080" height="2290" alt="image" src="./preview.jpg" />

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

## 🌐 Deployment Options

### Option 1: Using GitHub Actions (Automatic - Recommended)
1. Go to your repo **Settings** -> **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. The app will automatically deploy whenever you push to `main`.

### Option 2: Manual Deployment (No Workflow)
If you prefer not to use GitHub Actions:

1. Install the `gh-pages` package:
   ```bash
   npm install gh-pages --save-dev
   ```
2. Add these scripts to your `package.json`:
   ```json
   "homepage": "https://<your-username>.github.io/<your-repo-name>/",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
3. Run the deployment command:
   ```bash
   npm run deploy
   ```
4. On GitHub, go to **Settings** -> **Pages** and set the source branch to `gh-pages`.

---

## 📝 Important Notes for Users

Due to browser security policies:
1. **Add to Home Screen**: For the most stable performance, please use the "Add to Home Screen" feature on your mobile browser.
2. **Stay Awake**: Enable the **"Anti-Sleep Mode"** in the app settings to keep GPS active while the screen is on (but dimmed).
3. **GPS Permissions**: Ensure that location permissions are set to "While Using" or "Always".

## 🤝 Contributing

Contributions (Pull Requests) and bug reports (Issues) are welcome.

---
Made by [TomDev](https://github.com/TomDevX) and AI with ❤️🔥

# 🏃 Marathon Pace Buddy - React App

A professional React app for marathon runners with real-time pace tracking, voice alerts, analytics, and dual themes.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm start
# Opens at http://localhost:3000

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

## ✨ Features

- 🎨 **Dark & Light Themes** - Toggle between dark and pastel pink
- 📍 **Real-time GPS Tracking** - Accurate pace and distance
- 🔊 **Voice Alerts** - "Too fast", "Too slow" notifications
- 📊 **Analytics Dashboard** - Performance charts and stats
- 💾 **Data Export** - JSON and CSV downloads
- 🔋 **Battery Saver Mode** - GPS sampling every 30s
- 📱 **PWA Ready** - Install as native app
- 🌐 **Google Analytics** - Track user engagement

## 📦 What's Included

```
react-app/
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # All styles with themes
│   ├── index.js        # React entry point
│   └── index.css       # Global styles
├── public/
│   ├── index.html      # HTML with GA integration
│   └── manifest.json   # PWA manifest
├── package.json        # Dependencies
└── vercel.json         # Vercel config
```

## 🎯 Analytics Setup

### 1. Get Google Analytics ID

1. Go to https://analytics.google.com
2. Create property
3. Copy Measurement ID (G-XXXXXXXXXX)

### 2. Update the App

Edit `public/index.html`:
```javascript
// Replace G-XXXXXXXXXX with your ID (appears twice)
gtag('config', 'G-XXXXXXXXXX');
```

### 3. Deploy

```bash
vercel --prod
```

### 4. View Analytics

Go to GA dashboard to see:
- Page views
- Race starts/completions
- Pace alerts
- Split times
- GPS errors

## 🎨 Themes

**Dark Theme (Default):**
- Background: Deep navy gradient
- Accent: Purple (#bb86fc)
- Perfect for night runs

**Light Theme (Pastel Pink):**
- Background: Pink gradient
- Accent: Hot pink (#d946a6)
- Great for daytime

Toggle anytime with top-right button!

## 📊 Tracked Events

Auto-tracked in Google Analytics:
- `race_started` - User starts race
- `race_finished` - User completes race
- `pace_alert` - Off-pace notifications
- `split_completed` - Each km split
- `aid_station_reached` - Water stops
- `gps_error` - Tracking issues

## 🔧 Environment Variables

Create `.env` file:
```
REACT_APP_GA_ID=G-XXXXXXXXXX
```

Access in code:
```javascript
const GA_ID = process.env.REACT_APP_GA_ID;
```

## 📱 PWA Installation

Users can install as native app:

**iOS:**
1. Open in Safari
2. Share button
3. "Add to Home Screen"

**Android:**
1. Open in Chrome
2. Menu (⋮)
3. "Install App"

## 🚀 Deployment Options

### Vercel (Recommended)
```bash
vercel --prod
```

### Netlify
```bash
npm run build
# Drag 'build' folder to netlify.app/drop
```

### GitHub Pages
```bash
npm install --save-dev gh-pages

# Add to package.json scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d build"

npm run deploy
```

## 🔍 Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm start

# Build production
npm run build

# Run tests
npm test
```

## 📈 Performance

- First load: ~1-2 seconds
- GPS updates: Every 1-30 seconds
- Battery usage: Low (with saver mode)
- Offline capable: Yes (after first load)

## 🐛 Troubleshooting

**GPS not working?**
- Enable location services
- Grant browser permission
- Must use HTTPS

**Analytics not showing?**
- Check GA ID is correct
- Wait 24-48 hours for data
- Disable ad blockers for testing

**Build failing?**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📄 License

MIT License - Use freely!

## 🙏 Credits

Built for runners, by runners.

---

**Ready to deploy?** See [DEPLOY_AND_ANALYTICS.md](../DEPLOY_AND_ANALYTICS.md) for detailed instructions!

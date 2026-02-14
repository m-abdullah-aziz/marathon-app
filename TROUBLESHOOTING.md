# 🔧 Troubleshooting Guide

## Error: Cannot find module 'ajv/dist/compile/codegen'

This is a dependency conflict between React Scripts 5 and ajv versions.

### Quick Fix:

**Option 1: Use npm (Recommended)**

```bash
# Delete existing dependencies
rm -rf node_modules package-lock.json

# Install with legacy peer deps
npm install --legacy-peer-deps

# Start the app
npm start
```

**Option 2: Use Yarn**

```bash
# Delete existing dependencies
rm -rf node_modules yarn.lock

# Install with yarn
yarn install

# Start the app
yarn start
```

**Option 3: Force specific ajv version**

Add this to your `package.json`:

```json
{
  "overrides": {
    "ajv": "^8.12.0"
  }
}
```

Then:
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## Other Common Issues

### Issue: Port 3000 already in use

```bash
# Kill process on port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
PORT=3001 npm start
```

### Issue: Node version incompatibility

```bash
# Check your Node version
node -v

# React Scripts 5 needs Node 14+
# If needed, use nvm:
nvm install 18
nvm use 18
```

### Issue: Build fails

```bash
# Clear cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Build
npm run build
```

### Issue: Vercel deployment fails

```bash
# Make sure you have a build script
# In package.json:
"scripts": {
  "build": "react-scripts build"
}

# Deploy with specific Node version
# Create vercel.json if not exists:
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ]
}
```

---

## Fresh Install Steps

If all else fails, here's a clean start:

```bash
# 1. Delete everything
rm -rf node_modules package-lock.json

# 2. Clear npm cache
npm cache clean --force

# 3. Install with legacy peer deps
npm install --legacy-peer-deps

# 4. Start
npm start
```

---

## Still Having Issues?

### Try Vite instead of Create React App

Create React App is now legacy. Here's how to migrate to Vite:

```bash
# Create new Vite project
npm create vite@latest marathon-app -- --template react

# Copy your files
cd marathon-app
# Copy src/App.js, src/App.css from old project

# Install and run
npm install
npm run dev
```

---

## Environment Requirements

**Minimum versions:**
- Node.js: 14.0.0 or higher (18+ recommended)
- npm: 6.0.0 or higher
- Mac, Windows, or Linux

**Check your versions:**
```bash
node -v    # Should be 14+
npm -v     # Should be 6+
```

---

## Contact & Resources

If issues persist:
1. Check Node version: `node -v` (need 14+)
2. Use `--legacy-peer-deps` flag
3. Consider deploying the HTML version instead (zero dependencies!)

The HTML version (`marathon-pace-buddy-analytics.html`) works immediately with no installation required.

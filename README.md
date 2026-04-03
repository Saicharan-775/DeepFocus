# DeepFocus 🚀

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dee-focus?color=brightgreen&logo=chrome)](https://chrome.google.com/webstore/detail/deepfocus/...) [![GitHub stars](https://img.shields.io/github/stars/yourusername/focus-mode-extension?style=social)](https://github.com/yourusername/focus-mode-extension)

**DeepFocus** is a Chrome extension + dashboard that creates a distraction-free LeetCode environment. Block solutions/editorials during timed focus sessions, track your discipline, and build real coding muscle.

## ✨ Features

- **1-click Focus Sessions**: Auto-detects problem difficulty and sets optimal timer (Easy:10m, Medium:25m, Hard:40m)
- **Tab Switch Penalties**: Score drops 15pts per switch. Stay on-task!
- **Solution Blocking**: Hard blocks solutions/editorials during sessions
- **Copy/Paste Guard**: Prevents external code pasting (allows internal copy-paste)
- **Auto-Sync Dashboard**: Tracks sessions → revision list for spaced repetition
- **Sound Feedback**: Success/fail sounds on submissions
- **Self-Healing UI**: Widget persists through LeetCode SPA changes

## 🛠 Tech Stack

```
Frontend: React 18 + Vite + TailwindCSS + Framer Motion
Backend: Supabase (Postgres + Edge Functions + RLS)
Extension: Chrome MV3 + Service Worker
Deployment: Vercel/Netlify (site), Chrome Web Store (extension)
```

## 🚀 Quick Start (Local Dev)

### 1. Dashboard (localhost:5173)
```bash
cd deepfocus-site
npm install
cp .env.example .env  # Add your Supabase keys
npm run dev
```

### 2. Extension
1. `chrome://extensions/` → **Developer mode** → **Load unpacked** → `deepfocus-extension/`
2. **Pin** the extension to toolbar
3. Generate **Connection Token** from dashboard → Paste in popup

### 3. Test
1. Open LeetCode problem
2. Click extension icon → **Start Focus**
3. **Solutions** tab auto-blocks
4. Submit → Auto-syncs to dashboard

## 📦 Production Deployment

### Dashboard
```
npm run build  # vite build
# Deploy dist/ to Vercel/Netlify
```

### Extension
1. Zip `deepfocus-extension/`
2. Chrome Web Store Developer Dashboard → New Item

### Supabase (Production Ready)
```
- Migrations deployed
- Edge Functions: focus-event (token-validated)
- RLS: Hardened (user_id + token checks)
```

## 🔒 Security

- **Anon keys only** (publishable, RLS enforced)
- **Connection tokens** (hashed, short-lived)
- **No service_role keys** exposed
- **Queue-based sync** (offline-tolerant)

## 📊 Dashboard Features

- **Revision Sheet**: Spaced repetition from failed sessions
- **Streak Tracking**: Daily focus streaks
- **Insights**: Score trends, weak areas
- **Library**: Curated patterns/resources

## 🤝 Contributing

1. Fork → Clone → Dev setup
2. `git checkout -b feature/xyz`
3. Changes → `npm test` (add tests!)
4. PR with changelog

## 📄 License

MIT © 2024

---

**Made with ❤️ for coders who want to actually learn, not just pass.**


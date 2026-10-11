# ⚡ MYSTRIX — Nine Encrypted Rooms

> **Cyberpunk CTF Puzzle Challenge & Tournament System**

[![Live Demo](https://img.shields.io/badge/Live%20App-cognix--rouge.vercel.app-00FF66?style=for-the-badge&logo=vercel)](https://cognix-rouge.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-mystrix-blue?style=for-the-badge&logo=github)](https://github.com/vabhijit516-bot/mystrix)
[![Status](https://img.shields.io/badge/Leaderboard-Clean%20Slate%20(Reset)-brightgreen?style=for-the-badge)](https://cognix-rouge.vercel.app)

---

### 🌐 Live Production Deployment
**Play the CTF live:**  
👉 **[https://cognix-rouge.vercel.app](https://cognix-rouge.vercel.app)**

---

## 🎮 Overview

**Mystrix** is an immersive cyberpunk-themed CTF (Capture the Flag) web application featuring nine cryptographic security chambers. Teams register with a Team Name, Team Lead, and Team Member to decode encrypted ciphers, breach rooms, and climb the real-time tournament leaderboard.

---

## ✨ Features

- 🟢 **Authentic Cyberpunk Interface**: Dynamic HTML5 Canvas Matrix rain, phosphor green neon glow, scanlines, and crt flicker effects.
- 🔊 **Web Audio Synthesizer**: Procedural synthesized audio soundscapes (access granted chimes, denied buzzes, key clicks) via Web Audio API.
- 👥 **Team System**: Multi-member registration tracking both Team Lead and Member credentials.
- 🏆 **Dynamic Live Leaderboard**: 
  - Real-time ranking sorted by highest rooms completed and earliest completion timestamps.
  - Per-chamber finishing time stamps for every solved room.
  - Reset to a clean slate (0 teams) ready for live competitive events.
- 🔐 **Admin Access Control**: 
  - Exclusive root leaderboard reset privileges reserved for administrative team: `erroris`.
- 📧 **One-Click Standings Report**: 
  - Formatted email generation with timestamps and rankings dispatched directly to `vabhijit516@gmail.com`.

---

## 🧩 The Nine Encrypted Chambers

| Room | Title | Encrypted Key | Primary Solution | Cipher Mechanism |
| :---: | :--- | :--- | :--- | :--- |
| **01** | The Mirror Gate | `12Xnoen` | `neonX21` | Reverse Reflection |
| **02** | The Vector Vortex | `vtorce99` | `vector99` | Anagram Unscramble |
| **03** | The Caesar Circuit | `pduwlf08` | `matrix08` | Caesar Shift (-3) |
| **04** | The Glitch Lab | `7ltgcih` | `7glitch` | Leading Digit Reorder |
| **05** | The Reflection Vault | `31edoced` | `31decoded` | Inverted Text Reflection |
| **06** | The Binary Carousel | `bniray72` | `binary72` | Letter Scramble |
| **07** | The Kernel Switch | `ekrlen91` | `kernel91` | Transposition Swap |
| **08** | The Proxy Portal | `pyorx33` | `proxy33` | Dual Character Transposition |
| **09** | The Quantum Mirage | `6mutnaq` | `quantum6` | Mirror & Swap |

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Semantic Elements, Modern CSS3 custom properties & glassmorphism.
- **Audio**: Web Audio API (real-time procedural oscillator synthesis).
- **Visuals**: Canvas 2D Matrix Rain animation engine.
- **Bundler & Tooling**: Vite 5.
- **Deployment**: Vercel CI/CD.

---

## 🚀 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vabhijit516-bot/mystrix.git
   cd mystrix
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build production bundle:**
   ```bash
   npm run build
   ```

---

## 🔒 Administrative Controls

- **Admin Team Name**: `erroris`
- Teams registered under the alias `erroris` receive elevated root clearance with interactive controls to purge and reset the tournament leaderboard.

---

© 2026 Mystrix Project. Built for high-concurrency CTF competitions.

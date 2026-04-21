<h1 align="center">
    <img src="./.github/readme_files/title.png" alt="Math Castle" width="500">
</h1>

<h4 align="center">A tower-defence mathematics learning game — now with user authentication, a live backend, and advanced gameplay features.</h4>

<p align="center">
  <a href="#about">About</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#prerequisites">Prerequisites</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#running-the-backend">Running the Backend</a> •
  <a href="#running-the-frontend">Running the Frontend</a> •
  <a href="#environment-variables">Environment Variables</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#gameplay-guide">Gameplay Guide</a> •
  <a href="#game-features">Game Features</a> •
  <a href="#authentication-system">Authentication System</a> •
  <a href="#backend-modules">Backend Modules</a> •
  <a href="#scripts">Scripts</a> •
  <a href="#what-we-learned">What We Learned</a> •
  <a href="#the-team">The Team</a>
</p>

<div align="center">
    <img
        src="./.github/readme_files/math_castle_demo.gif"
        alt="Math Castle Demo"
    >
</div>

---

## About

Math Castle started as a game jam entry for the [TOP Jam 1 – Edutainment](https://itch.io/jam/top-jam-1) hosted by The Odin Project. Teams of up to 4 people had ~1 month to build a DOM-only educational game (no canvas, no game frameworks). We achieved **4th place** in fun, theme, and educational value.

The project has since been extended with a full **Express.js backend**, **JWT-based user authentication**, **real-time score persistence**, and major **gameplay enhancements** including a combo system, power-ups, particle effects, and a synthesised sound engine.

---

## Project Structure

```
math-castle/
│
├── src/                          # Frontend source (Webpack)
│   ├── index.html                # Main HTML shell
│   ├── index.js                  # App entry – mounts auth modal then game
│   ├── styles/
│   │   └── styles.css            # All CSS (game + auth modal + effects)
│   ├── img/                      # Game sprites and backgrounds
│   └── modules/
│       ├── game.js               # Core game loop (update / draw)
│       ├── enemy.js              # Enemy entity factory
│       ├── castle.js             # Castle health & rendering
│       ├── timer.js              # Countdown & spawn timers
│       ├── engine.js             # requestAnimationFrame engine
│       ├── scoreHandler.js       # Score state & DOM sync
│       ├── questionGenerator.js  # Math question factory
│       ├── questionHistory.js    # Question history table
│       ├── defaultSettings.js    # Game constants
│       ├── domUtils.js           # show/hide helpers
│       ├── createEnemySpriteSheet.js
│       ├── gameBoard.js
│       │
│       ├── authModal.js          # 🔐 Auth popup (Login / Register)
│       ├── soundEngine.js        # 🎵 Web Audio API sound synth
│       ├── comboSystem.js        # 🔥 Combo streak & multiplier
│       ├── particles.js          # 💥 Particle explosion effects
│       └── powerUps.js           # ⚡ Power-up system (Freeze/Shield/Double)
│
├── server/                       # Backend (Express.js)
│   ├── server.js                 # App entry – all middleware & routes
│   ├── modules/
│   │   ├── authService.js        # Advanced auth (bcrypt + JWT)
│   │   └── authEventEmitter.js   # Node.js EventEmitter for auth events
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification & role-based guards
│   └── routes/
│       ├── auth.js               # /api/auth/* endpoints
│       └── scores.js             # /api/scores/* endpoints
│
├── .env.example                  # Environment variable template
├── package.json                  # All dependencies & npm scripts
├── webpack.config.js             # Webpack bundler config
└── README.md                     # This file
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 + Vanilla CSS | Game UI, auth modal, effects |
| JavaScript (ES6 Modules) | All game logic |
| Webpack 5 | Module bundler & dev server |
| Web Audio API | Synthesised sound engine (no audio files) |
| CSS Animations | Particles, combo banner, power-ups, wave banner |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js 4 | HTTP server & router |
| **cookie-parser** | Cookie parsing & signing |
| **cookie-session** | Lightweight client-side cookie sessions |
| **express-session** | Full server-side sessions |
| **EventEmitter** (Node core) | Auth lifecycle event bus |
| **bcrypt** | Password hashing (cost factor 12) |
| **jsonwebtoken** | JWT access (15 min) & refresh (7 day) tokens |
| cors | Cross-origin requests from the dev server |
| nodemon | Auto-reload during development |

---

## Prerequisites

Make sure the following are installed on your machine:

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org/en/download/)
- **npm** v9 or later (bundled with Node.js)
- **Git** — [git-scm.com](https://git-scm.com/)

Check your installed versions:
```bash
node --version    # e.g. v20.11.0
npm --version     # e.g. 10.2.3
git --version     # e.g. git version 2.44.0
```

---

## Quick Start

> Run both the frontend **and** backend together.

```bash
# 1. Clone the repository
git clone https://github.com/kapaha/math-castle.git

# 2. Enter the project directory
cd math-castle

# 3. Install ALL dependencies (frontend devDependencies + backend dependencies)
npm install

# 4. Copy the environment template and fill in your secrets
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# 5. Open two separate terminals:

# ── Terminal 1 – Backend server (port 3001) ──────────────────
npm run serve

# ── Terminal 2 – Frontend dev server (port 8080) ─────────────
npm start
```

Then open **http://localhost:8080** in your browser.  
The auth popup will appear first. Register an account, then play!

---

## Running the Backend

The backend is a standalone Express.js server. Start it with:

```bash
# Production-style (one-shot start)
npm run serve

# Development mode (auto-restarts on file changes — uses nodemon)
npm run dev:server
```

The server starts on **http://localhost:3001** by default.

You will see:
```
🏰 Math Castle Server running on http://localhost:3001
   Mode     : development
   Auth     : JWT + bcrypt + express-session
   Cookies  : cookie-parser + cookie-session
```

### Backend Routes at a glance

| Method | URL | Auth Required | Description |
|---|---|---|---|
| GET  | `/api/health` | No | Server health check |
| POST | `/api/auth/register` | No | Register new account |
| POST | `/api/auth/login` | No | Login & get tokens |
| POST | `/api/auth/refresh` | No | Get new access token |
| POST | `/api/auth/logout` | Yes (JWT) | Logout & revoke refresh token |
| GET  | `/api/auth/me` | Yes (JWT) | Get own profile |
| PUT  | `/api/auth/change-password` | Yes (JWT) | Change password |
| GET  | `/api/auth/session` | No | Check server-side session |
| POST | `/api/scores/submit` | Yes (JWT) | Submit a score |
| GET  | `/api/scores/me` | No | Get your high score |

---

## Running the Frontend

The frontend uses Webpack Dev Server:

```bash
npm start            # Starts frontend on http://localhost:8080
# or
npm run dev:client   # Same as above
```

Webpack will compile the source files and automatically open the browser.  
Hot Module Replacement (HMR) is enabled — your changes appear instantly.

To build a production bundle:
```bash
npm run build        # Outputs to /dist
```

To deploy to GitHub Pages:
```bash
npm run deploy       # Builds then pushes /dist to gh-pages branch
```

---

## Environment Variables

Copy `.env.example` to `.env` and set each value:

```env
# Server port (default: 3001)
PORT=3001

# Node environment: 'development' | 'production'
NODE_ENV=development

# cookie-parser signs all cookies using this secret
COOKIE_SECRET=replace-with-a-long-random-string

# cookie-session uses two rotating keys for extra security
COOKIE_SESSION_KEY1=replace-with-key-one
COOKIE_SESSION_KEY2=replace-with-key-two

# express-session secret (server-side session store)
SESSION_SECRET=replace-with-session-secret

# JWT secrets — must be long, random, and DIFFERENT from each other
JWT_ACCESS_SECRET=replace-with-access-token-secret
JWT_REFRESH_SECRET=replace-with-refresh-token-secret
```

> ⚠️ **Never commit your `.env` file to Git.** The `.gitignore` already excludes it.

---

## API Reference

### `POST /api/auth/register`

Create a new account.

**Request body:**
```json
{
  "username": "MathWizard",
  "email": "wizard@example.com",
  "password": "Secure@123"
}
```

**Password rules:** 8–64 characters, must include uppercase, lowercase, a number, and a special character (`@$!%*?&#^`).

**Success (201):**
```json
{
  "success": true,
  "message": "Registration successful!",
  "user": { "id": "...", "username": "MathWizard", "role": "player", ... },
  "accessToken": "<JWT>"
}
```

A `mc_refresh` HttpOnly cookie is also set with the refresh token.

---

### `POST /api/auth/login`

Login with username + password.

**Request body:**
```json
{ "username": "MathWizard", "password": "Secure@123" }
```

**Success (200):**
```json
{
  "success": true,
  "user": { ... },
  "accessToken": "<JWT>"
}
```

> Account lockout: 5 failed attempts → locked for 15 minutes.

---

### `POST /api/auth/refresh`

Exchange the `mc_refresh` cookie for a new access token.

**Response:**
```json
{ "success": true, "accessToken": "<new JWT>" }
```

---

### `POST /api/auth/logout`

Revokes refresh token and destroys session.

**Header:** `Authorization: Bearer <accessToken>`

---

### `GET /api/auth/me`

Fetch the current user's profile.

**Header:** `Authorization: Bearer <accessToken>`

---

### `PUT /api/auth/change-password`

Change your password. Forces logout on all devices.

**Request body:**
```json
{ "oldPassword": "OldPass@1", "newPassword": "NewPass@2" }
```

---

### `POST /api/scores/submit`

Submit a score after a game session.

**Header:** `Authorization: Bearer <accessToken>`

**Request body:**
```json
{ "score": 150 }
```

**Response:**
```json
{ "success": true, "message": "New high score!", "highScore": 150 }
```

---

### `GET /api/health`

Basic server health check, no auth needed.

**Response:**
```json
{ "status": "ok", "timestamp": "...", "uptime": 177.3 }
```

---

## Gameplay Guide

### How to Play

1. Open **http://localhost:8080**
2. The **Auth Popup** appears — login or register to proceed
3. Click **Play** on the start screen
4. Choose your difficulty: **Easy | Medium | Hard | Insane**
5. Enemies march from the left toward your castle on the right
6. **Click an enemy** to select it — its question highlights
7. **Type the answer** in the input box at the bottom and press **Enter**
8. Surviving until the 5-minute timer runs out = **Victory**!
9. The castle reaching **0 health** = **Game Over**

---

### Difficulty Levels

| Difficulty | Operators | Number Range | Notes |
|---|---|---|---|
| Easy | `+` `-` | 1–5 | Great for beginners |
| Medium | `+` `-` `×` | 1–10 | Introduces multiplication |
| Hard | `+` `-` `×` | 1–30 | Larger numbers |
| Insane | `+` `-` `×` `÷` | 1–100 | Division included, large numbers |

---

### Scoring

| Action | Points |
|---|---|
| Correct answer | +10 × combo multiplier × power-up bonus |
| Wrong answer | -2 |
| Castle takes damage | -10 |

---

## Game Features

### 🔥 Combo System
- Answer questions **correctly in a row** to build a streak
- Combo multiplier: **1× → 2× → 3× → 4× → 5× (MAX)**
- A coloured banner pulses at each new combo level (yellow → orange → red → purple)
- Any wrong answer or castle hit **resets** the combo

### 💥 Particle Explosions
- 18 coloured particles **burst** from the enemy's exact position when defeated
- Castle hits produce a red particle flash

### 🏷️ Floating Score Labels
- Score earned (`+10`, `+60 ×3`) floats up from each kill

### 🎵 Sound Engine (Web Audio API)
- All sounds are **synthesised in real-time** — no external audio files needed
- Sounds: correct answer arpeggio, wrong answer buzz, enemy death explosion, castle hit, combo milestone fanfare, power-up chime, game-over fall, victory fanfare
- **🔊 Mute button** in the HUD toggles all sounds (🔊 → 🔇)

### ⚡ Power-Ups
| Power-Up | Effect | Duration |
|---|---|---|
| ❄️ **FREEZE** | Stops all enemies in place | 5 seconds |
| 🛡️ **SHIELD** | Blocks the next castle hit | Until triggered |
| ⚡ **DOUBLE** | Doubles all points earned | 10 seconds |

- Tokens **float onto the board** randomly (every ~20–40 seconds)
- **Click the token** on the board to collect it before it disappears (8 seconds)
- Active power-up badges **glow** in the HUD bar below the menu

### ⚔️ Wave System
- Every **10 enemy kills** = a new wave
- Each wave **increases enemy spawn speed**
- A large animated **"⚔️ WAVE X ⚔️"** banner pops on screen at each transition

### ❤️ Castle Hit Feedback
- Full-screen **red flash** overlay on damage
- Castle **shakes** side-to-side
- Shield absorption triggers a **green particle burst**

### 📳 Input Feedback
- Wrong answer → input box **shakes** and briefly turns red

### 📊 Game-Over Stats
- Final screen shows: Final **Score**, **Wave reached**, **Enemies killed**, and **Question History**

---

## Authentication System

The Auth Modal intercepts the game before it loads. Players must login or register before playing.

### Features
| Feature | Detail |
|---|---|
| Glassmorphism design | Frosted glass card over blurred game background |
| Animated particles | 6 floating light orbs inside the modal |
| Login / Register tabs | Smooth animated switcher |
| Password strength meter | Live colour bar measuring strength 0–5 |
| Eye toggle | Show/hide password on all password fields |
| Remember me | Checkbox (planned for refresh-token auto-login) |
| Forgot password | Helper message directing to admin |
| Error shake animation | Red shake on failed login/register |
| Loading spinner | Button disables during API call |
| Success animation | ✅ bounce + fade before game loads |
| User badge | Fixed pill in top-right showing username; click to logout |
| JWT auto-restore | localStorage token silently re-authenticates on page refresh |

### Security Details
- Passwords hashed with **bcrypt** (cost factor 12)
- **Access tokens** expire in 15 minutes (stored in `localStorage`)
- **Refresh tokens** expire in 7 days (stored in HttpOnly `mc_refresh` cookie, unexploitable by JS)
- **Account lockout**: 5 failed login attempts → 15-minute lock
- **Changing password invalidates** all refresh tokens on every device
- **Role system**: `player` (default) | `admin` (protected routes)
- `express-session` keeps server-side state; `cookie-session` stores UI metadata (last login time)

---

## Backend Modules

### `cookie-parser`
Added as the very first middleware in `server.js`. Signs all cookies using `COOKIE_SECRET`, making them tamper-evident. The frontend never needs to read signed cookies directly.

### `cookie-session`
A lightweight alternative to a full session store. Stores the **last login timestamp** and UI state directly in a signed cookie (`mc_ui_session`). No database required for this layer.

### `express-session`
A full server-side session (`mc_sess`) that persists the logged-in user across requests. Used by the `/api/auth/session` endpoint so server-rendered pages can know who is authenticated without parsing a JWT.

### `EventEmitter` (Node.js core)
`server/modules/authEventEmitter.js` exposes a singleton `AuthEventEmitter` (extends `EventEmitter`). Every auth action fires a typed event:

| Event | Fired when |
|---|---|
| `user:registered` | New account created |
| `user:login` | Successful login |
| `user:logout` | User logs out |
| `user:loginFailed` | Wrong credentials (rate-limit awareness) |
| `user:passwordChanged` | Password changed successfully |

`server.js` listens to these events and logs them to the console. In a production app you would plug analytics, email notifications, or a rate-limiter here.

### Advanced Auth (`authService.js`)
- `register()` — validates, hashes password, stores user, issues token pair
- `login()` — verifies password, applies lockout logic, issues token pair
- `refreshAccess()` — validates refresh token from cookie, issues new access token
- `logout()` — revokes refresh token from the in-memory set
- `changePassword()` — re-hashes, invalidates all refresh tokens for user
- `getUser()` / `updateHighScore()` — profile & score helpers

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start frontend webpack dev server on port 8080 |
| `npm run dev:client` | Same as `npm start` |
| `npm run serve` | Start backend Express server on port 3001 |
| `npm run dev:server` | Start backend with nodemon (auto-reload on file change) |
| `npm run build` | Build optimised frontend bundle to `/dist` |
| `npm run deploy` | Build then deploy to GitHub Pages |
| `npm run lint` | Run ESLint on all JS files |
| `npm run format` | Auto-format all files with Prettier |

---

## What We Learned

- Using pull requests for peer code review
- Git branch workflow for parallel feature development
- Working with people across different time zones
- Using Trello (Kanban / Agile) for project organisation
- Setting up team meetings on Discord
- ESLint + Prettier for consistent code style
- ES6 Modules for code separation and reusability
- Webpack for bundling and code splitting
- GitHub Actions for continuous deployment
- **Express.js middleware chaining** (cookie-parser → cookie-session → express-session)
- **JWT security patterns** (short-lived access tokens + long-lived HttpOnly refresh tokens)
- **Node.js EventEmitter** for decoupled architecture
- **Web Audio API** for procedural sound generation
- **CSS custom properties on DOM elements** for particle animation directions

---

## The Team

<table>
    <tr>
        <td align="center">
            <a href="https://github.com/kapaha">
                <img src="https://avatars.githubusercontent.com/u/62726177?v=4" width="100px;" alt="Kai Paterson-Hall"/>
                <br />
                <sub>
                    <b>Kai Paterson-Hall</b>
                </sub>
            </a>
            <br />
        </td>
        <td align="center">
            <a href="https://github.com/tanselbay1">
                <img src="https://avatars.githubusercontent.com/u/58618654?v=4" width="100px;" alt="Tansel Bayraktaroglu"/>
                <br />
                <sub>
                    <b>Tansel Bayraktaroglu</b>
                </sub>
            </a>
            <br />
        </td>
        <td align="center">
            <a href="https://github.com/dwarjie">
                <img src="https://avatars.githubusercontent.com/u/37862404?v=4" width="100px;" alt="Mark"/>
                <br />
                <sub>
                    <b>Mark</b>
                </sub>
            </a>
            <br />
        </td>
        <td align="center">
            <a href="https://github.com/Ocoldwell">
                <img src="https://avatars.githubusercontent.com/u/75363386?v=4" width="100px;" alt="Ollie Coldwell"/>
                <br />
                <sub>
                    <b>Ollie Coldwell</b>
                </sub>
            </a>
            <br />
        </td>
    </tr>
</table>

---

<p align="center">Made with ❤️ by | Aryan | Arjun | Dev |</p>
"# CastleKing" 

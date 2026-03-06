<p align="center">
  <img src="docs/assets/logo.png" alt="OpenFlat Logo" width="120" />
</p>

<h1 align="center">🏠 OpenFlat</h1>

<p align="center">
  <strong>The ultimate open-source hub for shared living.</strong><br/>
  Inspired by Flatastic — built for everyone.
</p>

<p align="center">
  <a href="#-getting-started"><img src="https://img.shields.io/badge/Get%20Started-blue?style=for-the-badge" alt="Get Started" /></a>
  <a href="#-mvp-roadmap"><img src="https://img.shields.io/badge/Roadmap-orange?style=for-the-badge" alt="Roadmap" /></a>
  <a href="#-contributing"><img src="https://img.shields.io/badge/Contribute-green?style=for-the-badge" alt="Contribute" /></a>
</p>

---

## 📖 About

**OpenFlat** eliminates passive-aggressive sticky notes and spreadsheet chaos by centralizing **chores**, **groceries**, and **finances** into one gamified experience. It is designed for shared flats (WGs) and any form of communal living.

Unlike proprietary alternatives, OpenFlat is:
- **Open-source** — transparent, auditable, community-driven (Apache 2.0)
- **Self-hostable** — run it on your own hardware with Docker, or use the hosted cloud version
- **Extensible** — modular architecture, easy to contribute new features
- **Cross-platform** — React web app + React Native mobile apps (iOS & Android)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend (Web)** | React |
| **Frontend (Mobile)** | React Native (iOS + Android) |
| **Backend** | .NET (C#) — REST API |
| **Database** | PostgreSQL |
| **Realtime** | WebSockets / SignalR |
| **Containerization** | Docker / Docker Compose |
| **i18n** | Multi-language support (English default, German included) |

---

## 🚀 Core Modules

### 🧹 Gamified Cleaning Schedule

Who's doing what — and who isn't doing anything at all?

| Feature | Description |
|---|---|
| **Points System** | Users earn points for every completed task. Turn "doing the dishes" into a leaderboard climb. |
| **Rotation Logic** | Automate recurring tasks with flexible schedules (e.g., "Take out the trash every Tuesday"). |
| **Smart Reminders** | Push notifications to remind you before the plants die or the trash takes on a life of its own. |
| **Task Templates** | Pre-built templates for common chores that can be customized per household. |

### 🛒 Smart Shopping List

Never stand in the supermarket wondering what's missing again.

| Feature | Description |
|---|---|
| **Real-time Sync** | See items being checked off instantly as your flatmates shop. |
| **Frequent Items** | Intelligent suggestions based on your household's buying habits. |
| **Visual Details** | Add images or specific descriptions to ensure the right brand of milk makes it home. |
| **Contextual Lists** | Create separate lists for groceries, hardware stores, or party supplies. |

### 💰 Expense Tracker

Transparency without the headache of manual calculations.

| Feature | Description |
|---|---|
| **Instant Logging** | Snap a bill or log a purchase (vacuum cleaner, detergent) in seconds. |
| **Debt Balancing** | "Who owes whom" algorithm that simplifies complex debts into single-click repayments (Splitwise-style). |
| **Monthly Overview** | Track where the household budget is going with charts and summaries. |
| **Split Options** | Split equally, by percentage, or by custom amounts. |

### 📌 Digital Bulletin Board

The central heartbeat of your flat.

| Feature | Description |
|---|---|
| **Wall Updates** | Post announcements like "Away for the weekend" or "Electrician coming at 10 AM." |
| **Reactions & Comments** | React and comment on flatmate updates to keep communication fluid. |
| **Pinned Posts** | Pin important announcements so they stay visible. |

---

## ✨ Additional Modules

### 📅 WG Calendar

A shared calendar for everything that matters.

* **Shared Events** — Plan dinners, parties, or cleaning days together.
* **Visitor Coordination** — Let flatmates know when guests are coming.
* **Quiet Hours** — Define and display agreed-upon quiet times.

### 🗳️ Polls

Democratic decision-making for the flat.

* **Quick Polls** — Create polls for household decisions (new furniture, rule changes, weekend plans).
* **Voting** — Each flatmate gets a vote; results are visible in real-time.
* **Deadlines** — Set a deadline and get automatic reminders before it expires.

### 📖 WG Wiki

A central knowledge base for your flat.

* **House Rules** — Document agreed-upon rules in one place.
* **Important Info** — WiFi password, landlord contact, trash schedule, meter readings.
* **Onboarding** — New flatmate? Point them to the wiki and they're up to speed.

---

## 🎮 Gamification

Gamification is woven into the cleaning schedule and can extend to other modules.

| Element | Description |
|---|---|
| **Points** | Earn points for completing tasks. Harder tasks = more points. |
| **Leaderboard** | Weekly and monthly rankings to see who's pulling their weight. |
| **Badges** | Unlock achievements like *"Putzprofi"* (cleaning pro), *"Einkaufsheld"* (shopping hero), or *"Streak Master"* (7 days in a row). |
| **Streaks** | Keep your streak alive by completing tasks on consecutive days. |

---

## 👥 User Management

| Feature | Description |
|---|---|
| **Registration** | Email + password or Social Login (Google, Apple). |
| **WG Onboarding** | Create a new flat or join an existing one via **invite link** or **invite code**. |
| **Multi-WG Support** | One account can be part of multiple flats (e.g., main apartment + vacation home). |
| **Equal Roles** | All flatmates are equal — no admin hierarchy. Every member can manage settings. |
| **Profiles** | Each user has a profile with avatar, display name, and notification preferences. |

---

## 🔔 Notifications

| Channel | Details |
|---|---|
| **Push Notifications** | Primary channel — browser push (web) and native push (iOS/Android). |
| **Configurable** | Each user can configure notifications per module (cleaning reminders, new shopping items, expense updates, board posts). |
| **Smart Timing** | Reminders are sent at sensible times, not at 3 AM. |

---

## 🌍 Internationalization (i18n)

OpenFlat is multilingual from day one.

* **Default language:** English
* **Included:** German (Deutsch)
* **Extensible:** Community contributions for additional languages are welcome — translations are managed via standard i18n resource files.

---

## 🚢 Deployment

OpenFlat supports two deployment models:

### Self-Hosted (Docker)

```bash
git clone https://github.com/your-org/openflat.git
cd openflat
docker compose up -d
```

Full control over your data. Ideal for privacy-conscious households. Includes:
- Docker Compose setup with API, database, and web frontend
- Environment-based configuration
- Backup & restore scripts

### Cloud-Hosted (SaaS)

> *Coming soon* — a managed version where you just sign up and start using OpenFlat without any setup.

---

## 🗺️ MVP Roadmap

| Phase | Modules | Focus |
|---|---|---|
| **Phase 1** | 🧹 Cleaning Schedule, 👥 User Management, 🎮 Gamification | Core loop: sign up, create a flat, manage chores, earn points |
| **Phase 2** | 🛒 Shopping List, 🔔 Notifications | Real-time collaboration, push notifications |
| **Phase 3** | 💰 Expense Tracker, 📌 Bulletin Board | Financial transparency, flat communication |
| **Phase 4** | 📅 Calendar, 🗳️ Polls, 📖 Wiki | Quality-of-life modules |

---

## 🏁 Getting Started

> *Detailed setup instructions will be added once the first implementation milestone is reached.*

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- .NET 8+ SDK (for backend development)
- PostgreSQL 16+ (or use the Docker-provided instance)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/openflat.git
cd openflat

# Start infrastructure (database, etc.)
docker compose -f docker-compose.dev.yml up -d

# Start backend
cd backend
dotnet run

# Start web frontend
cd ../frontend
npm install && npm run dev
```

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, translations, or documentation — every contribution matters.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

> *A detailed `CONTRIBUTING.md` with coding guidelines, architecture overview, and development workflow will be added soon.*

---

## 📄 License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](LICENSE) file for details.

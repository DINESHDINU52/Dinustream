# DinuStream — System Architecture Document

**DinuStream** is a private, bespoke cinema streaming platform crafted exclusively for two users: **Dinu** and **Kanmani**. Designed to evoke the intimacy and visual fidelity of a private screening room rather than a generic mass-market utility, it blends cinematic aesthetics, real-time synchronized playback, and low-latency interaction.

---

## 1. High-Level Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              CLIENT BROWSERS                 │
                        │         (Dinu & Kanmani - Web / TV)          │
                        └───────┬──────────────┬──────────────┬────────┘
                                │              │              │
                   HTTPS / HLS  │    WebSocket │  Realtime DB │
                   Media Stream │    Sync/Room │  / Firestore │
                                │              │              │
                                ▼              ▼              ▼
                    ┌────────────────┐ ┌───────────────┐ ┌───────────────┐
                    │ Jellyfin Media │ │ DinuStream    │ │ Firebase Real │
                    │     Server     │ │ Sync Manager  │ │ -time Chat    │
                    └───────┬────────┘ └───────────────┘ └───────────────┘
                            │ (Local SSD Cache)
                            ▼
                    ┌────────────────┐
                    │ rclone VFS     │
                    │ Caching Layer  │
                    └───────┬────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │  Google Drive  │
                    │ (Master Media) │
                    └────────────────┘
```

### Core Components

1. **Frontend Experience (Next.js 14+ / App Router)**
   - **Framework**: Next.js with TypeScript.
   - **Styling & Motion**: Tailwind CSS + Framer Motion for ambient glows, smooth curtain/page transitions, backdrop blur, and micro-interactions.
   - **Design Language**: *Private Cinema Noir* — deep true blacks (#050507), warm ember/gold or ambient dynamic neon highlights, typography inspired by luxury cinema titles, and responsive layouts for desktop, tablet, mobile, and 10-foot TV interfaces.

2. **Player Subsystem (Custom Cinema Player)**
   - HTML5 Video + `hls.js` integration for adaptive bitrate streaming.
   - Cinematic Dolby Atmos intro reel trigger before feature presentation.
   - Chapter / Marker navigation (Skip Intro, Skip Recap, Skip Outro, Auto-play Next Episode).
   - Direct sync hooks for remote playback commands.

3. **Real-time Synchronization (DinuStream Sync Manager)**
   - Ultra-lightweight WebSocket server (Node.js / ws or Socket.io) handling lockstep state synchronization:
     - Shared Playhead / State: Play, Pause, Seek, Rate change with drift correction (< 200ms latency tolerance).
     - Group Presence & Heartbeats: "Dinu is watching", "Kanmani paused at 1:24:02".
     - Group Up-Next Queue: Collaborative watch queue.

4. **Private Chat & Reactions (Firebase)**
   - Firebase Realtime Database or Firestore strictly dedicated to peer chat, emoji bursts, reaction timestamps, and GIF sharing during playback without burdening media streaming.

5. **Media Pipeline & Cloud Storage (Oracle Cloud + Google Drive)**
   - **Oracle Cloud (Always-Free or Standard Compute)**: Hosts Jellyfin Media Server and DinuStream Sync Manager.
   - **Storage Strategy**: Master library stored on Google Drive; mounted via `rclone` with `--vfs-cache-mode full` on Oracle Cloud's fast NVMe/SSD cache. Popular and currently watched streams buffer into SSD for zero-stutter playback.

---

## 2. Project Folder Structure

A clean, modular Next.js monorepo / standalone structure designed for progressive feature delivery without premature complexity:

```
dinustream/
├── .github/                       # CI/CD workflows
├── docs/                          # Architecture diagrams, deployment guides
├── public/
│   ├── assets/
│   │   ├── branding/              # DinuStream logos, crests, badges
│   │   └── intros/                # Dolby Atmos & Cinema prelude video clips
│   └── mock/                      # Mock posters, backdrops, metadata for early UI
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Profile picker & switch (Dinu / Kanmani)
│   │   │   └── profile/
│   │   ├── (cinema)/              # Main browsing & viewing routes
│   │   │   ├── layout.tsx         # Ambient navbar, background audio/glow provider
│   │   │   ├── page.tsx           # Premium Home (Curated Hero, Continue, Trending)
│   │   │   ├── movies/            # Movies catalog & detail modal
│   │   │   ├── series/            # Series catalog & season/episode selector
│   │   │   ├── watch/[id]/        # Custom Video Player route
│   │   │   ├── party/[roomId]/    # Synchronized Watch Group room
│   │   │   ├── my-list/           # Saved watchlist
│   │   │   └── search/            # Instant fuzzy search
│   │   ├── admin/                 # Private dashboard (cache status, sync stats)
│   │   ├── api/                   # Local mock/helper endpoints (pre-Jellyfin)
│   │   ├── layout.tsx             # Root layout with custom fonts & theme
│   │   └── globals.css            # Base cinema theme variables & utilities
│   ├── components/
│   │   ├── common/                # Buttons, Modals, Ambient Glows, Badges
│   │   ├── navigation/            # TV-ready Sidebar / Header with remote navigation
│   │   ├── media/                 # Movie/Series cards, Hero Banner, Carousel
│   │   ├── player/                # Custom Player UI, Controls, Intro Splash, Skip Buttons
│   │   ├── party/                 # Sync status indicator, Member avatar badge, Sync bar
│   │   ├── chat/                  # Cinema chat drawer, Emoji picker, Floating reactions
│   │   └── profiles/              # Dinu & Kanmani avatar selection & passcodes
│   ├── hooks/
│   │   ├── usePlayer.ts           # Video state, time tracking, HLS engine
│   │   ├── useSyncRoom.ts         # WebSocket synchronization logic & drift recovery
│   │   ├── useCinemaChat.ts       # Firebase chat listener & reaction emitter
│   │   └── useTVNavigation.ts     # D-pad / Keyboard spatial navigation (Arrow keys + Enter)
│   ├── lib/
│   │   ├── constants.ts           # App constants, mock data, sample video sources
│   │   ├── types.ts               # Movie, Series, Episode, Room, and User models
│   │   └── utils.ts               # Time formatters, classnames helper
│   └── services/                  # Swappable service abstraction layers
│       ├── mediaService.ts        # Mock data now -> Jellyfin API client later
│       ├── syncService.ts         # Mock sync now -> WebSocket server later
│       └── chatService.ts         # Mock chat now -> Firebase later
├── ARCHITECTURE.md                # System architectural blueprint
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Phased Implementation Roadmap

To avoid premature integration headaches and ensure a polished design first, development is structured in clear, verifiable phases:

| Phase | Focus Area | Deliverables |
|---|---|---|
| **Phase 1: Project Skeleton & Design System** | Core UI / Aesthetics | Next.js + TS + Tailwind setup; Design system tokens (Noir, Gold, Ambient glassmorphism, Google Fonts); Profile selector (Dinu vs Kanmani); Shell layouts for Web & TV. |
| **Phase 2: Premium Catalog & Navigation** | Content Discovery | Hero showcase with auto-trailers/ambient backlight; Movies & Series browsing; Seasons/Episodes drawer; My List; Continue Watching with progress bars; Instant Search with mock data. |
| **Phase 3: Bespoke Cinema Video Player** | Core Playback Experience | Custom HTML5/HLS player; Dolby Atmos intro clip playback; Skip Intro/Recap/Outro buttons; Next Episode trigger; Keyboard & TV spatial navigation shortcuts. |
| **Phase 4: DinuStream Sync & Watch Room** | Dual Synchronization | Private Watch Party UI; Shared playhead state engine (Play, Pause, Seek synchronization with drift compensation); Member presence & shared queue. |
| **Phase 5: Cinema Chat & Floating Reactions** | Social Layer (Firebase) | Unobtrusive floating chat overlay, time-coded emoji reactions over video, GIF support for live commentary. |
| **Phase 6: Jellyfin & Oracle Cloud Integration** | Backend Infrastructure | Jellyfin API bridge replacing mock services; `rclone` mount configuration with NVMe SSD cache; Admin dashboard for library refresh & stream health. |

---

## 4. Dependencies Roadmap

### Immediate Dependencies (Phase 1–3 Frontend)
- `next` & `react` / `react-dom`
- `typescript`, `@types/react`, `@types/node`
- `tailwindcss`, `postcss`, `autoprefixer`
- `framer-motion` (cinematic transitions, layout animations)
- `lucide-react` (premium minimalist icons)
- `clsx` & `tailwind-merge` (dynamic class management)
- `hls.js` (HLS video stream playback support)

### Future Dependencies (Phases 4–6 Backend & Integrations)
- `socket.io-client` / native `WebSocket` (Sync Manager communication)
- `firebase` (client SDK for Firestore / Realtime DB chat)
- `rclone` (OS-level daemon on Oracle Linux VM)
- `jellyfin` (Dockerized service on Oracle Cloud VM)

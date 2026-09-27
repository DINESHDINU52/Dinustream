# DinuStream — Standalone Cinema UI & Design System

A pure, decoupled frontend UI extraction of **DinuStream ("Your Private Cinema")**.

This project contains **100% of the UI, design system, cinema themes, motion animations, and interactive component library**, completely isolated from:
- ❌ Jellyfin media server & C# backend
- ❌ Firebase / Firestore / Authentication endpoints
- ❌ WebSockets & real-time sync daemons
- ❌ Cloudflare tunnels & Oracle NVMe daemons

All data is powered by an in-memory and local-storage mock catalog featuring 4K UHD titles, Dolby Atmos audio tags, interactive video player controls, watch party lobby, live chat with reactions, admin telemetry gauges, and an exhaustive design system showcase.

---

## 🎨 Extracted UI Components & Directory Structure

```
dinustream-ui/
├── app/
│   ├── page.tsx                     # Cinema Home: Hero banner, rails, categories
│   ├── movie/[id]/page.tsx          # Movie details view with cast, badges, actions
│   ├── series/[id]/page.tsx         # Series view with season/episode drawer
│   ├── watch/[id]/page.tsx          # Cinema Video Player with aspect ratio & skip controls
│   ├── watch-together/page.tsx      # Synchronized party lobby, queue, live reactions
│   ├── admin/page.tsx               # Admin telemetry, NVMe gauges, cache manager table
│   ├── design-system/page.tsx       # Live interactive design system & UI catalog
│   ├── login/page.tsx               # Cinema profile switcher & PIN login
│   ├── layout.tsx                   # CinemaShell layout with persistent navigation
│   └── globals.css                  # Tailwind v4 cinema color tokens & styles
├── components/
│   ├── ui/                          # Button, Badge, Card, Modal, Drawer, Toast, GlassSurface...
│   ├── media/                       # HeroBanner, MediaCard, MediaCarousel, ContinueWatchingCard...
│   ├── layout/                      # CinemaNavbar, CinemaShell, MobileBottomNav, AmbientBackdrop...
│   ├── player/                      # CinemaPlayer, EpisodeSelectorDrawer, SkipButtons, Overlays...
│   ├── chat/                        # GroupChat, ChatMessage, EmojiPicker, ReactionBar...
│   ├── watch-together/              # WatchGroup, ParticipantList, GroupQueue, MovieSelector...
│   ├── admin/                       # SystemHealthGauges, StorageMetricsPanel, CacheManagerTable...
│   ├── profiles/                    # ProfileSwitcher, ProfileSettingsModal, AvatarPickerModal...
│   └── design-system/               # DesignSystemShowcase with interactive demos
├── lib/
│   ├── design-system.ts             # CINEMA_TOKENS & DESIGN_TOKENS design system
│   ├── mock-data.ts                 # Full mock catalog of movies, series, chats, metrics
│   ├── constants.ts                 # Cinema profiles, navigation links, platform constants
│   ├── constants/avatars.ts         # Marvel, Star Wars & Cinema Icon character avatars
│   ├── player/aspectRatio.ts        # Aspect ratio modes (Fit, Fill, Stretch, Zoom 110-150%)
│   ├── services/                    # Pure mock mediaService, profileService, adminService
│   └── utils.ts                     # cn, formatting helpers, percentages
└── public/
    └── avatars/characters/          # All 20+ character SVG avatar assets
```

---

## 🚀 Running the UI Project

To run this standalone UI:

```bash
cd dinustream-ui
npm install
npm run dev
```

The UI server will start at **`http://localhost:3001`**.

### Available Route Previews:
- **`http://localhost:3001/`** — Home Explore Page (Hero Carousel, Continue Watching, Media Rails)
- **`http://localhost:3001/movie/dune-part-two`** — 4K Movie Details
- **`http://localhost:3001/series/cyberpunk-edgerunners`** — TV Series & Episode Drawer
- **`http://localhost:3001/watch/dune-part-two`** — Full Cinema Player with Aspect Ratio controls & Segment Skips
- **`http://localhost:3001/watch-together`** — Synchronized Screening Suite & Lobby
- **`http://localhost:3001/admin`** — NVMe Storage, Cache Table, and System Health
- **`http://localhost:3001/design-system`** — Comprehensive Design System & Component Showcase
- **`http://localhost:3001/login`** — Profile Selection & PIN Entry (Enter `1234` or click profiles)

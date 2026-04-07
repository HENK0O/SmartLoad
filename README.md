# SmartLoad

A modern strength training tracker built with Next.js, React, and Supabase. Create programs, log workouts, track progression, and crush PRs.

## Features

- **Program Builder** — Create custom programs with exercises, sets, reps, and target weights
- **Live Workout Tracking** — Real-time set logging with rest timers, RPE, and notes
- **Smart Progression** — AI-driven suggestions for weight/reps increases based on history
- **Unit Support** — Switch between kg and lbs instantly; all data stored in kg
- **Analytics Dashboard** — Volume tracking, PR history, exercise trends, and weekly stats
- **Calendar View** — Visual workout history by month
- **Offline Mode** — Queue changes when offline, sync automatically when back online
- **PWA** — Install as a native-like app on any device
- **iOS App** — Capacitor wrapper for App Store distribution
- **Bilingual** — French and English with instant language switching
- **Dark/Light Theme** — Full theme support with smooth transitions

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth) |
| Mobile | Capacitor (iOS) |
| PWA | @ducanh2912/next-pwa |
| Language | TypeScript |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/HENK0O/SmartLoad.git
cd SmartLoad
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Run

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

## iOS App

```bash
npm run build          # outputs to out/
npm run cap:sync       # sync to native project
npm run cap:open:ios   # open in Xcode
```

See `IOS-SETUP.md` for detailed instructions.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── workout/[id]/     # Live workout session
│   ├── programs/[id]/    # Program editor
│   ├── analytics/        # Stats dashboard
│   ├── calendar/         # Workout calendar
│   └── settings/         # User preferences
├── components/           # Reusable UI components
│   └── ui/               # shadcn/ui primitives
├── hooks/                # Custom React hooks
├── lib/                  # Core utilities
│   ├── context.tsx       # Global state (lang, theme, unit)
│   ├── i18n.ts           # Translations (FR/EN)
│   ├── progression.ts    # Smart progression engine
│   ├── exercises.ts      # Exercise catalog
│   └── supabase.ts       # Supabase client
supabase/
└── migrations/           # SQL migrations
```

## Screenshots

![Dashboard](image.png) ![Workout](image-1.png)

## Author

Built by [HENK0O](https://github.com/HENK0O)

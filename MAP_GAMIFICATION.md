# 🎮 Portal Gamification System

## Overview

The Portal Gamification System transforms the map experience into a "Waze meets Pokémon Go" style game where AR scenes (Portals) have varying levels of rarity, accessibility, and reward potential. This creates urgency, exclusivity, and engagement for users exploring the world.

---

## 📍 Publishing Flow

When a user publishes an AR scene, they configure **Portal Settings** that determine how their portal appears and behaves on the map:

### Publish Screen (`PostDetailsScreen.tsx`)
1. User creates an AR scene in Figment
2. Navigates to publish screen with cover image and video
3. Selects "Add Locations" to pin the portal on the map
4. **⚠️ Portal Settings only appear when locations are set**
5. Configures:
   - **Rarity Tier** - How valuable/rare the portal is
   - **Signal Mode** - When/how the portal is accessible
6. Portal settings are saved to Firestore as `portalSettings` field

### Data Structure

```typescript
interface PortalSettings {
    rarity: 'Common' | 'Rare' | 'Mythic' | 'Anomaly';
    signalMode: 'AlwaysOn' | 'FaintSignal' | 'Distorting' | 'LockedOn';
    createdAt: string;           // ISO timestamp
    randomSeed: number;          // 0-1, used for deterministic visibility windows
    
    // Conditional configs based on signal mode:
    faintSignalConfig?: { dailyDurationMinutes: number };
    distortingConfig?: { intervalsPerDay: number };
    lockedOnConfig?: { 
        lockTrigger: 'proximity' | 'followers';
        lockDuration: 'timed' | 'permanent';
        maxConcurrentLocks: number;
        allowedUserIds: string[];
    };
}
```

---

## 💎 Rarity Tiers

Rarity determines the **visual prominence** and **reward multiplier** for a portal.

| Tier | Color | Multiplier | Description |
|------|-------|------------|-------------|
| **Common** | `#8E8E93` (Gray) | 1x | Standard portals, basic rewards |
| **Rare** | `#3B82F6` (Blue) | 2x | Enhanced rewards, subtle glow effect |
| **Mythic** | `#A855F7` (Purple) | 4x | Premium experience, strong visual presence |
| **Anomaly** | `#F43F5E` (Red) | 12x | Ultra-rare, maximum rewards, dramatic styling |

### Visual Treatment by Rarity

#### Common
- Gray left border
- No glow effect
- Standard text color
- Neutral background

#### Rare
- Blue left border (4px)
- Light blue background tint (`rgba(59, 130, 246, 0.08)`)
- Blue glow on thumbnail (opacity 0.5, radius 8)
- Blue "R" badge on thumbnail
- Blue title text

#### Mythic
- Purple left border (4px)
- Purple background tint (`rgba(168, 85, 247, 0.12)`)
- Strong purple glow (opacity 0.7, radius 10)
- Purple "M" badge on thumbnail
- Purple title text
- Thumbnail border (1.5px)

#### Anomaly
- Red left border (4px) + outer border
- Red background tint (`rgba(244, 63, 94, 0.12)`)
- Maximum glow (opacity 0.9, radius 12)
- Red "A" badge on thumbnail
- Bold red title text (fontWeight 700)
- Thumbnail border (2px)

---

## 📡 Signal Modes

Signal Mode determines **when and how** a portal is accessible.

### 1. Always Visible (`AlwaysOn`)
- **Icon**: Radio (📻)
- **Color**: Green (`#22C55E`)
- **Behavior**: Portal is always visible and accessible
- **Best for**: Public attractions, permanent installations

### 2. Faint Signal (`FaintSignal`)
- **Icon**: Eye-off (👁️‍🗨️)
- **Color**: Purple (`#A855F7`)
- **Configuration**: `dailyDurationMinutes` (default: 60)
- **Behavior**: 
  - Portal appears for a random window each day
  - Window duration = configured minutes
  - Window start time is deterministic based on `randomSeed`
  - Same portal appears at same time each day
- **Best for**: Mystery/discovery experiences, limited-time events

#### Visibility Window Calculation
```typescript
// Uses seeded random for consistent daily appearance
const dayStart = new Date().setHours(0, 0, 0, 0);
const maxStartMinute = 24 * 60 - duration;
const startMinute = seededRandom(seed + dayStart) * maxStartMinute;
const windowStart = dayStart + (startMinute * 60000);
const windowEnd = windowStart + (duration * 60000);
```

### 3. Distorting (`Distorting`)
- **Icon**: Pulse (〰️)
- **Color**: Amber (`#F59E0B`)
- **Configuration**: `intervalsPerDay` (default: 12)
- **Behavior**:
  - Portal "flickers" on and off throughout the day
  - Visibility alternates between ON and OFF periods
  - Duration of each period = 24h / (intervalsPerDay * 2)
- **Best for**: Glitchy/unstable portals, challenging hunts

#### Visibility Window Calculation
```typescript
const totalMinutesPerDay = 24 * 60;
const intervalDuration = totalMinutesPerDay / (intervalsPerDay * 2);
const minuteOfDay = currentTime.getHours() * 60 + currentTime.getMinutes();
const intervalIndex = Math.floor(minuteOfDay / intervalDuration);
const isVisible = intervalIndex % 2 === 0; // Even intervals = visible
```

### 4. Locked On (`LockedOn`)
- **Icon**: Lock (🔒)
- **Color**: Red (`#F43F5E`)
- **Configuration**:
  - `lockTrigger`: How users gain access (`proximity` or `followers`)
  - `lockDuration`: How long access lasts (`timed` or `permanent`)
  - `maxConcurrentLocks`: Maximum users with access (0 = unlimited)
  - `allowedUserIds`: Pre-approved user list
- **Behavior**:
  - Only visible/accessible to approved users
  - Users must meet criteria to "lock on"
- **Best for**: Exclusive content, follower rewards, VIP experiences

---

## ⏱️ Temporal States

Temporal states create **urgency** by showing the portal's lifecycle stage.

| State | Duration | Effects |
|-------|----------|---------|
| **Stabilizing** | First 24 hours | Portal is "forming" - users may see warnings |
| **Peak** | Hours 24-48 | Maximum rewards, golden styling, highest urgency |
| **Decaying** | After 48 hours | Reduced rewards, dimmed styling, less urgency |

### Visual Treatment

#### Peak State
- Golden "⚡ PEAK" badge
- Golden glow on fuel reward
- Enhanced border styling
- Animated effects (optional)

#### Decaying State
- Dimmed fuel badge
- Grayed-out fuel icon and text
- Reduced visual prominence

---

## ⛽ Fuel Rewards

Fuel is the primary reward currency for visiting portals.

### Base Calculation

```typescript
function calculateFuelReward(distanceKm: number, rarity: PortalRarity): number {
    // Closer = more reward (inverse relationship)
    const distanceFactor = Math.max(0.1, 1 / (1 + distanceKm * 0.5));
    
    // Base reward scaled by distance
    const baseReward = 100 * distanceFactor;
    
    // Apply rarity multiplier
    const multiplier = getRarityMultiplier(rarity);
    
    return Math.round(baseReward * multiplier);
}

function getRarityMultiplier(rarity: PortalRarity): number {
    switch (rarity) {
        case 'Common': return 1;
        case 'Rare': return 2;
        case 'Mythic': return 4;
        case 'Anomaly': return 12;
    }
}
```

### Reward Modifiers

- **Peak State**: Bonus multiplier (visual indicator shown)
- **Distance**: Closer portals = higher base reward
- **Rarity**: Higher rarity = higher multiplier

---

## 🗺️ Map Experience

### Map Screen (`MapScreen.tsx`)

The map displays all portals with locations. Key features:

1. **Markers**: Color-coded by rarity
2. **Info Window**: Shows portal preview on tap
3. **Bottom Sheet**: Scrollable list of nearby portals

### Bottom Sheet List (`MapBottomSheet.tsx`)

Each portal displays:

```
┌─────────────────────────────────────────────────┐
│ [Thumb]  ┌─ RARE ─┐ ┌─ 📡 Faint Signal ─┐     │
│   [R]    │        │ │                    │     │
│          └────────┘ └────────────────────┘     │
│          Portal Title                    ──>   │
│          @username                             │
│          🔥 1.52  •  0.2 km  •  ⚡ PEAK        │
│          ↑ fuel     distance    temporal       │
└─────────────────────────────────────────────────┘
```

### Visual Hierarchy

1. **Rarity Label** (colored badge): COMMON, RARE, MYTHIC, ANOMALY
2. **Signal Mode Label** (icon + text): Always Visible, Faint Signal, Distorting, Locked On
3. **Title & Username**
4. **Meta Row**: Fuel reward, distance, temporal state badge, multiplier

---

## 🔧 Technical Implementation

### Key Files

| File | Purpose |
|------|---------|
| `src/types/portal.ts` | Type definitions, constants, color mappings |
| `src/services/PortalService.ts` | Visibility logic, temporal states, reward calculations |
| `src/screens/PostDetailsScreen.tsx` | Publish UI with portal settings |
| `src/screens/MapScreen.tsx` | Map with portal markers |
| `src/components/MapBottomSheet.tsx` | Portal list with gamified styling |
| `src/store/slices/feedSlice.ts` | Feed fetching with portalSettings |
| `src/store/index.ts` | Main store with portalSettings support |

### Data Flow

```
┌─────────────────┐
│  Figment AR     │ Create AR scene
└────────┬────────┘
         ▼
┌─────────────────┐
│ PostDetailsScreen│ Configure portal settings
└────────┬────────┘
         ▼
┌─────────────────┐
│   Firestore     │ Save post + portalSettings
└────────┬────────┘
         ▼
┌─────────────────┐
│   feedSlice     │ Fetch posts with portalSettings
└────────┬────────┘
         ▼
┌─────────────────┐
│   MapScreen     │ Filter posts with locations
└────────┬────────┘
         ▼
┌─────────────────┐
│ MapBottomSheet  │ Display with gamified UI
└─────────────────┘
```

### Constants (`src/types/portal.ts`)

```typescript
export const RARITY_COLORS: Record<PortalRarity, string> = {
    Common: '#8E8E93',
    Rare: '#3B82F6',
    Mythic: '#A855F7',
    Anomaly: '#F43F5E',
};

export const SIGNAL_MODE_LABELS: Record<SignalMode, string> = {
    AlwaysOn: 'Always Visible',
    FaintSignal: 'Faint Signal',
    Distorting: 'Distorting',
    LockedOn: 'Locked On',
};

export const RARITY_MULTIPLIERS: Record<PortalRarity, number> = {
    Common: 1,
    Rare: 2,
    Mythic: 4,
    Anomaly: 12,
};
```

---

## 🎯 UX Goals

1. **Urgency**: Peak states and limited visibility create FOMO
2. **Exclusivity**: Higher rarity feels premium and special
3. **Discovery**: Faint signals encourage exploration and timing
4. **Reward Loop**: Fuel rewards scale with effort and rarity
5. **Visual Hierarchy**: Rare portals are immediately recognizable

---

## 📱 Future Enhancements

- [ ] Animated glow effects for Anomaly portals
- [ ] Sound effects for discovering rare portals
- [ ] Push notifications for Peak state transitions
- [ ] Follower picker for Locked On mode
- [ ] Portal visibility countdown timers
- [ ] AR waypoint navigation to portals
- [ ] Leaderboards for fuel collection
- [ ] Portal claiming/ownership mechanics

---

## 🐛 Troubleshooting

### Portals showing as "Common" despite settings
- **Cause**: `portalSettings` not included when fetching from Firestore
- **Fix**: Ensure `feedSlice.ts` and `store/index.ts` include `portalSettings: data.portalSettings || null`

### Portals not appearing on map
- **Cause 1**: No locations set when publishing
- **Cause 2**: Visibility filter too strict (FaintSignal outside window)
- **Fix**: MapScreen now shows all portals regardless of visibility

### Portal settings not saving
- **Cause**: Firestore rejects `undefined` values
- **Fix**: Only include config objects for the selected signal mode

/**
 * Portal Types & Configuration
 * 
 * Defines the gamified portal mechanics including rarity tiers,
 * signal availability modes, and temporal states.
 */

// ============================================================
// RARITY TIERS
// ============================================================

/**
 * Portal rarity determines visual treatment and fuel multiplier.
 * - Common: 1x multiplier, white/gray glow
 * - Rare: 2x multiplier, blue pulse
 * - Mythic: 5x multiplier, purple aurora
 * - Anomaly: 10x multiplier, glitch/chromatic aberration
 */
export type PortalRarity = 'Common' | 'Rare' | 'Mythic' | 'Anomaly';

/**
 * Fuel multipliers for each rarity tier.
 */
export const RARITY_MULTIPLIERS: Record<PortalRarity, number> = {
    Common: 1,
    Rare: 2,
    Mythic: 5,
    Anomaly: 10,
};

/**
 * Visual colors for each rarity tier.
 */
export const RARITY_COLORS: Record<PortalRarity, string> = {
    Common: '#9CA3AF',    // Gray
    Rare: '#3B82F6',      // Blue
    Mythic: '#A855F7',    // Purple
    Anomaly: '#F43F5E',   // Red/Pink with glitch effect
};

// ============================================================
// SIGNAL MODES (Availability)
// ============================================================

/**
 * Signal modes determine when and how a portal is visible.
 * - AlwaysOn: Always visible on the map
 * - FaintSignal: Appears randomly for limited intervals daily
 * - Distorting: Appears at fixed intervals throughout the day
 * - LockedOn: Binds to specific users permanently
 */
export type SignalMode = 'AlwaysOn' | 'FaintSignal' | 'Distorting' | 'LockedOn';

/**
 * Display labels for signal modes.
 */
export const SIGNAL_MODE_LABELS: Record<SignalMode, string> = {
    AlwaysOn: 'Always Visible',
    FaintSignal: 'Faint Signal',
    Distorting: 'Distorting',
    LockedOn: 'Locked On',
};

/**
 * Configuration for Faint Signal mode.
 * The portal appears randomly throughout the day for the specified duration.
 */
export interface FaintSignalConfig {
    /** How long the portal appears per day (in minutes) */
    dailyDurationMinutes: 30 | 60 | 120;
}

/**
 * Configuration for Distorting mode.
 * The portal appears at fixed intervals throughout the day for 20-minute windows.
 * - 6x = every 4 hours (20 min each)
 * - 12x = every 2 hours (20 min each)
 * - 24x = every hour (20 min each)
 */
export interface DistortingConfig {
    /** Number of 20-minute appearance windows per day */
    intervalsPerDay: 6 | 12 | 24;
}

/**
 * Trigger condition for Locked On mode.
 */
export type LockTrigger = 'proximity' | 'scan' | 'priorPortal' | 'invite';

/**
 * Duration for which a lock remains active.
 */
export type LockDuration = '24h' | '7d' | 'permanent';

/**
 * Configuration for Locked On mode.
 * The portal binds to specific users and tracks them.
 */
export interface LockedOnConfig {
    /** What triggers the lock for non-listed users */
    lockTrigger: LockTrigger;
    /** How long the lock remains active */
    lockDuration: LockDuration;
    /** Maximum number of concurrent locks (0 = unlimited) */
    maxConcurrentLocks: number;
    /** Pre-selected user IDs who get immediate access */
    allowedUserIds: string[];
}

// ============================================================
// TEMPORAL STATES (Runtime Computed)
// ============================================================

/**
 * Temporal states are computed at runtime based on spawn time and signal mode.
 * - Stabilizing: First 12 minutes after spawn, cannot enter yet
 * - Peak: Optimal time, full rewards and unique interactions
 * - Decaying: Last phase, reduced rewards and visual distortion
 * - Offline: Not currently visible
 */
export type TemporalState = 'Stabilizing' | 'Peak' | 'Decaying' | 'Offline';

/**
 * Temporal state durations (in minutes) for a typical visibility window.
 */
export const TEMPORAL_DURATIONS = {
    stabilizing: 12,  // First 12 minutes
    peak: 60,         // Middle period (varies by window)
    decaying: 8,      // Last 8 minutes before disappearing
};

// ============================================================
// PORTAL SETTINGS (Stored on Post)
// ============================================================

/**
 * Complete portal settings stored on each Post.
 */
export interface PortalSettings {
    /** Rarity tier affecting fuel multiplier and visuals */
    rarity: PortalRarity;

    /** Signal mode determining visibility rules */
    signalMode: SignalMode;

    /** Configuration for Faint Signal mode */
    faintSignalConfig?: FaintSignalConfig;

    /** Configuration for Distorting mode */
    distortingConfig?: DistortingConfig;

    /** Configuration for Locked On mode */
    lockedOnConfig?: LockedOnConfig;

    /** ISO timestamp when portal was created */
    createdAt: string;

    /** Seed for random visibility window generation (Faint Signal) */
    randomSeed?: number;

    /** 
     * Mystery Mode - Hides portal details until user is within unlock distance.
     * - Black thumbnail placeholder
     * - Hidden creator name
     * - Title shows "Unknown Artifact Detected"
     * - Distance-based color gradient: black→red→yellow→green
     * - Unlocks at 20 yards
     */
    isMystery?: boolean;
}

// ============================================================
// MYSTERY MODE CONSTANTS
// ============================================================

/**
 * Distance thresholds for mystery portal color transitions (in meters).
 * Color gradient: Black → Red → Yellow → Green → UNLOCKED
 */
export const MYSTERY_DISTANCE_THRESHOLDS = {
    /** Portal shows on map list (meters) - ~1000 yards */
    visible: 914,
    /** Transition from black to red (meters) */
    red: 500,
    /** Transition from red to yellow (meters) */
    yellow: 200,
    /** Transition from yellow to green (meters) */
    green: 50,
    /** Portal unlocks and reveals full details (meters) - ~20 yards */
    unlock: 18,
};

/**
 * Colors for mystery portal distance states.
 */
export const MYSTERY_COLORS = {
    hidden: '#000000',    // Black - far away
    red: '#EF4444',       // Red - getting closer
    yellow: '#F59E0B',    // Yellow - close
    green: '#22C55E',     // Green - very close
    unlocked: '#A855F7',  // Purple - revealed!
};

// ============================================================
// PORTAL LOCK RECORD (Firestore Document)
// ============================================================

/**
 * Record of a user's lock on a Locked On portal.
 * Stored in Firestore: portalLocks/{portalId}/locks/{userId}
 */
export interface PortalLockRecord {
    userId: string;
    portalId: string;
    lockedAt: string;      // ISO timestamp
    expiresAt?: string;    // ISO timestamp (null for permanent)
    lockTrigger: LockTrigger;
}

// ============================================================
// FUEL CONSTANTS
// ============================================================

/** Maximum fuel that can be earned from a single portal */
export const MAX_FUEL_REWARD = 10000;

/** Base fuel per kilometer walked */
export const BASE_FUEL_PER_KM = 10;

// ============================================================
// DEFAULT PORTAL SETTINGS
// ============================================================

/**
 * Default portal settings for new posts.
 */
export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
    rarity: 'Common',
    signalMode: 'AlwaysOn',
    createdAt: new Date().toISOString(),
};

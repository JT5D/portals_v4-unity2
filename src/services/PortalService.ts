/**
 * PortalService
 * 
 * Centralized service for all portal state computations and mechanics.
 * Handles fuel rewards, temporal states, visibility, and lock management.
 */

import {
    PortalRarity,
    SignalMode,
    TemporalState,
    PortalSettings,
    PortalLockRecord,
    RARITY_MULTIPLIERS,
    RARITY_COLORS,
    TEMPORAL_DURATIONS,
    MAX_FUEL_REWARD,
    BASE_FUEL_PER_KM,
    DEFAULT_PORTAL_SETTINGS,
    MYSTERY_DISTANCE_THRESHOLDS,
    MYSTERY_COLORS,
} from '../types/portal';
import { Post } from '../types';

// ============================================================
// FUEL CALCULATIONS
// ============================================================

/**
 * Calculate fuel reward based on distance and rarity.
 * Formula: min(distanceKm * BASE_FUEL_PER_KM * rarityMultiplier, MAX_FUEL_REWARD)
 * 
 * @param distanceKm - Distance in kilometers
 * @param rarity - Portal rarity tier
 * @returns Calculated fuel reward (capped at MAX_FUEL_REWARD)
 */
export function calculateFuelReward(distanceKm: number, rarity: PortalRarity = 'Common'): number {
    const multiplier = RARITY_MULTIPLIERS[rarity];
    const baseFuel = distanceKm * BASE_FUEL_PER_KM * multiplier;
    return Math.min(Math.round(baseFuel * 100) / 100, MAX_FUEL_REWARD);
}

/**
 * Get the fuel multiplier for a rarity tier.
 */
export function getRarityMultiplier(rarity: PortalRarity): number {
    return RARITY_MULTIPLIERS[rarity];
}

/**
 * Get the display color for a rarity tier.
 */
export function getRarityColor(rarity: PortalRarity): string {
    return RARITY_COLORS[rarity];
}

// ============================================================
// TEMPORAL STATE CALCULATIONS
// ============================================================

/**
 * Get the current temporal state of a portal.
 * Computes based on when the portal became visible (spawn time).
 * 
 * @param portal - The post with portal settings
 * @param currentTime - Current time (default: now)
 * @returns Current temporal state
 */
export function getTemporalState(
    portal: Post,
    currentTime: Date = new Date()
): TemporalState {
    const settings = portal.portalSettings;
    if (!settings) return 'Peak'; // Default for non-configured portals

    // For AlwaysOn portals, always return Peak
    if (settings.signalMode === 'AlwaysOn') {
        return 'Peak';
    }

    // Get the current visibility window
    const window = getCurrentVisibilityWindow(portal, currentTime);
    if (!window) {
        return 'Offline';
    }

    const elapsed = (currentTime.getTime() - window.start.getTime()) / 60000; // minutes
    const remaining = (window.end.getTime() - currentTime.getTime()) / 60000; // minutes

    if (elapsed < TEMPORAL_DURATIONS.stabilizing) {
        return 'Stabilizing';
    } else if (remaining < TEMPORAL_DURATIONS.decaying) {
        return 'Decaying';
    } else {
        return 'Peak';
    }
}

/**
 * Get minutes remaining in current temporal state.
 */
export function getTemporalStateRemaining(
    portal: Post,
    currentTime: Date = new Date()
): number {
    const state = getTemporalState(portal, currentTime);
    const window = getCurrentVisibilityWindow(portal, currentTime);

    if (!window) return 0;

    const elapsed = (currentTime.getTime() - window.start.getTime()) / 60000;
    const remaining = (window.end.getTime() - currentTime.getTime()) / 60000;

    switch (state) {
        case 'Stabilizing':
            return Math.max(0, TEMPORAL_DURATIONS.stabilizing - elapsed);
        case 'Decaying':
            return Math.max(0, remaining);
        case 'Peak':
            return Math.max(0, remaining - TEMPORAL_DURATIONS.decaying);
        default:
            return 0;
    }
}

// ============================================================
// VISIBILITY CALCULATIONS
// ============================================================

interface VisibilityWindow {
    start: Date;
    end: Date;
}

/**
 * Check if a portal is currently visible to a user.
 * 
 * @param portal - The post with portal settings
 * @param userId - The viewing user's ID
 * @param currentTime - Current time (default: now)
 * @param userLocks - User's active lock records (for LockedOn mode)
 * @returns Whether the portal is visible
 */
export function isPortalVisible(
    portal: Post,
    userId: string,
    currentTime: Date = new Date(),
    userLocks: PortalLockRecord[] = []
): boolean {
    const settings = portal.portalSettings;
    if (!settings) return true; // Default visible for non-configured portals

    switch (settings.signalMode) {
        case 'AlwaysOn':
            return true;

        case 'FaintSignal':
            return isInFaintSignalWindow(portal, currentTime);

        case 'Distorting':
            return isInDistortingWindow(portal, currentTime);

        case 'LockedOn':
            return isUserLockedOn(portal, userId, currentTime, userLocks);

        default:
            return true;
    }
}

/**
 * Get the current visibility window for a portal.
 */
export function getCurrentVisibilityWindow(
    portal: Post,
    currentTime: Date = new Date()
): VisibilityWindow | null {
    const settings = portal.portalSettings;
    if (!settings) return null;

    switch (settings.signalMode) {
        case 'AlwaysOn':
            // Always visible - return a large window
            return {
                start: new Date(0),
                end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            };

        case 'FaintSignal':
            return getFaintSignalWindow(portal, currentTime);

        case 'Distorting':
            return getDistortingWindow(portal, currentTime);

        case 'LockedOn':
            // LockedOn portals are always visible once locked
            return {
                start: new Date(settings.createdAt),
                end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            };

        default:
            return null;
    }
}

/**
 * Get the next visibility window for a portal.
 */
export function getNextVisibilityWindow(
    portal: Post,
    currentTime: Date = new Date()
): VisibilityWindow | null {
    const settings = portal.portalSettings;
    if (!settings) return null;

    // If currently visible, return next window after current ends
    const currentWindow = getCurrentVisibilityWindow(portal, currentTime);
    if (currentWindow && currentTime >= currentWindow.start && currentTime <= currentWindow.end) {
        // Find next window after current ends
        return getNextWindowAfter(portal, currentWindow.end);
    }

    // Find next upcoming window
    return getNextWindowAfter(portal, currentTime);
}

// ============================================================
// SIGNAL MODE HELPERS
// ============================================================

/**
 * Check if currently in a Faint Signal visibility window.
 * Uses a seeded random to generate consistent daily appearance times.
 */
function isInFaintSignalWindow(portal: Post, currentTime: Date): boolean {
    const window = getFaintSignalWindow(portal, currentTime);
    if (!window) return false;
    return currentTime >= window.start && currentTime <= window.end;
}

/**
 * Get the Faint Signal window for today.
 * The portal appears at a random time each day for the configured duration.
 */
function getFaintSignalWindow(portal: Post, currentTime: Date): VisibilityWindow | null {
    const settings = portal.portalSettings;
    if (!settings?.faintSignalConfig) return null;

    const duration = settings.faintSignalConfig.dailyDurationMinutes;
    const seed = settings.randomSeed || hashString(portal.id);

    // Get start of day
    const dayStart = new Date(currentTime);
    dayStart.setHours(0, 0, 0, 0);

    // Generate random start time within the day (leaving room for duration)
    const maxStartMinute = 24 * 60 - duration;
    const startMinute = seededRandom(seed + dayStart.getTime()) * maxStartMinute;

    const start = new Date(dayStart.getTime() + startMinute * 60000);
    const end = new Date(start.getTime() + duration * 60000);

    return { start, end };
}

/**
 * Check if currently in a Distorting visibility window.
 */
function isInDistortingWindow(portal: Post, currentTime: Date): boolean {
    const window = getDistortingWindow(portal, currentTime);
    if (!window) return false;
    return currentTime >= window.start && currentTime <= window.end;
}

/**
 * Get the current or most recent Distorting window.
 * Windows are 20 minutes each, distributed evenly throughout the day.
 */
function getDistortingWindow(portal: Post, currentTime: Date): VisibilityWindow | null {
    const settings = portal.portalSettings;
    if (!settings?.distortingConfig) return null;

    const intervals = settings.distortingConfig.intervalsPerDay;
    const windowDuration = 20; // 20 minutes each window
    const intervalMinutes = (24 * 60) / intervals;

    // Get start of day
    const dayStart = new Date(currentTime);
    dayStart.setHours(0, 0, 0, 0);

    // Find which interval we're in
    const minutesSinceDayStart = (currentTime.getTime() - dayStart.getTime()) / 60000;
    const intervalIndex = Math.floor(minutesSinceDayStart / intervalMinutes);

    // Calculate window start for this interval
    const windowStartMinute = intervalIndex * intervalMinutes;
    const start = new Date(dayStart.getTime() + windowStartMinute * 60000);
    const end = new Date(start.getTime() + windowDuration * 60000);

    // Only return if we're within the 20-minute window
    if (currentTime <= end) {
        return { start, end };
    }

    return null;
}

/**
 * Check if user has an active lock on the portal.
 */
function isUserLockedOn(
    portal: Post,
    userId: string,
    currentTime: Date,
    userLocks: PortalLockRecord[]
): boolean {
    const settings = portal.portalSettings;
    if (!settings?.lockedOnConfig) return false;

    // Check if user is in the pre-selected list
    if (settings.lockedOnConfig.allowedUserIds?.includes(userId)) {
        return true;
    }

    // Check for active lock record
    const lock = userLocks.find(l => l.portalId === portal.id && l.userId === userId);
    if (!lock) return false;

    // Check if lock has expired
    if (lock.expiresAt) {
        return new Date(lock.expiresAt) > currentTime;
    }

    return true; // Permanent lock
}

/**
 * Get next window after a given time.
 */
function getNextWindowAfter(portal: Post, afterTime: Date): VisibilityWindow | null {
    const settings = portal.portalSettings;
    if (!settings) return null;

    switch (settings.signalMode) {
        case 'Distorting': {
            const intervals = settings.distortingConfig?.intervalsPerDay || 12;
            const intervalMinutes = (24 * 60) / intervals;

            const dayStart = new Date(afterTime);
            dayStart.setHours(0, 0, 0, 0);

            const minutesSinceDayStart = (afterTime.getTime() - dayStart.getTime()) / 60000;
            const nextIntervalIndex = Math.ceil(minutesSinceDayStart / intervalMinutes);

            const windowStartMinute = nextIntervalIndex * intervalMinutes;
            const start = new Date(dayStart.getTime() + windowStartMinute * 60000);
            const end = new Date(start.getTime() + 20 * 60000);

            return { start, end };
        }

        case 'FaintSignal': {
            // Next day's window
            const nextDay = new Date(afterTime);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            return getFaintSignalWindow(portal, nextDay);
        }

        default:
            return null;
    }
}

// ============================================================
// SIGNAL STRENGTH
// ============================================================

/**
 * Compute signal strength for UI display (0-100).
 * Higher is stronger/clearer.
 */
export function computeSignalStrength(
    portal: Post,
    currentTime: Date = new Date()
): number {
    const state = getTemporalState(portal, currentTime);

    switch (state) {
        case 'Stabilizing': {
            const window = getCurrentVisibilityWindow(portal, currentTime);
            if (!window) return 0;
            const elapsed = (currentTime.getTime() - window.start.getTime()) / 60000;
            const progress = elapsed / TEMPORAL_DURATIONS.stabilizing;
            return Math.min(100, Math.round(progress * 50)); // 0-50 during stabilizing
        }

        case 'Peak':
            return 100;

        case 'Decaying': {
            const window = getCurrentVisibilityWindow(portal, currentTime);
            if (!window) return 0;
            const remaining = (window.end.getTime() - currentTime.getTime()) / 60000;
            const progress = remaining / TEMPORAL_DURATIONS.decaying;
            return Math.max(0, Math.round(progress * 50 + 25)); // 75->25 during decay
        }

        case 'Offline':
            return 0;

        default:
            return 100;
    }
}

/**
 * Get human-readable signal strength label.
 */
export function getSignalStrengthLabel(strength: number): string {
    if (strength >= 90) return 'Locked On';
    if (strength >= 60) return 'Strong Signal';
    if (strength >= 30) return 'Distorting';
    if (strength > 0) return 'Faint Signal';
    return 'No Signal';
}

// ============================================================
// LOCK MANAGEMENT
// ============================================================

/**
 * Create a lock record for a user on a portal.
 * This would typically be saved to Firestore.
 */
export function createLockRecord(
    portalId: string,
    userId: string,
    settings: PortalSettings,
    trigger: 'proximity' | 'scan' | 'priorPortal' | 'invite'
): PortalLockRecord {
    const lockedAt = new Date().toISOString();
    let expiresAt: string | undefined;

    if (settings.lockedOnConfig?.lockDuration !== 'permanent') {
        const duration = settings.lockedOnConfig?.lockDuration === '24h'
            ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;
        expiresAt = new Date(Date.now() + duration).toISOString();
    }

    return {
        userId,
        portalId,
        lockedAt,
        expiresAt,
        lockTrigger: trigger,
    };
}

/**
 * Check if a portal can accept more locks.
 */
export function canAcceptMoreLocks(
    settings: PortalSettings,
    currentLockCount: number
): boolean {
    const maxLocks = settings.lockedOnConfig?.maxConcurrentLocks || 0;
    if (maxLocks === 0) return true; // Unlimited
    return currentLockCount < maxLocks;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Simple string hash for seeded random generation.
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Seeded random number generator (0-1).
 */
function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * Get display text for temporal state.
 */
export function getTemporalStateDisplay(
    portal: Post,
    currentTime: Date = new Date()
): string {
    const state = getTemporalState(portal, currentTime);
    const remaining = Math.ceil(getTemporalStateRemaining(portal, currentTime));

    switch (state) {
        case 'Stabilizing':
            return `Stabilizing (${remaining}m)`;
        case 'Peak':
            return 'Peak Window';
        case 'Decaying':
            return `Decaying (${remaining}m)`;
        case 'Offline':
            return 'Offline';
        default:
            return 'Active';
    }
}

/**
 * Get the default portal settings.
 */
export function getDefaultPortalSettings(): PortalSettings {
    return {
        ...DEFAULT_PORTAL_SETTINGS,
        createdAt: new Date().toISOString(),
    };
}

// ============================================================
// MYSTERY PORTAL HELPERS
// ============================================================

/**
 * Check if a mystery portal is unlocked based on user's distance.
 * @param distanceMeters - Distance from user to portal in meters
 * @returns Whether the mystery is unlocked (within ~20 yards)
 */
export function isMysteryUnlocked(distanceMeters: number): boolean {
    return distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.unlock;
}

/**
 * Get the color for a mystery portal based on distance.
 * Color gradient: Black → Red → Yellow → Green → Unlocked (Purple)
 * @param distanceMeters - Distance from user to portal in meters
 * @returns Color hex string
 */
export function getMysteryColor(distanceMeters: number): string {
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.unlock) {
        return MYSTERY_COLORS.unlocked; // Purple - revealed!
    }
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.green) {
        return MYSTERY_COLORS.green; // Green - very close
    }
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.yellow) {
        return MYSTERY_COLORS.yellow; // Yellow - close
    }
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.red) {
        return MYSTERY_COLORS.red; // Red - getting closer
    }
    return MYSTERY_COLORS.hidden; // Black - far away
}

/**
 * Get display text for mystery portal distance status.
 * @param distanceMeters - Distance from user to portal in meters
 * @returns Display text describing proximity
 */
export function getMysteryDistanceLabel(distanceMeters: number): string {
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.unlock) {
        return '✨ UNLOCKED';
    }
    // Convert to yards for display (1 meter ≈ 1.0936 yards)
    const yards = Math.round(distanceMeters * 1.0936);
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.green) {
        return `🔥 ${yards} yards - Almost there!`;
    }
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.yellow) {
        return `⚡ ${yards} yards - Getting warmer!`;
    }
    if (distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.red) {
        return `👁️ ${yards} yards - Signal detected`;
    }
    return `📡 ${yards} yards away`;
}

/**
 * Check if mystery portal should be shown on the map list.
 * Mystery portals are only shown when user is within ~1000 yards.
 */
export function isMysteryInRange(distanceMeters: number): boolean {
    return distanceMeters <= MYSTERY_DISTANCE_THRESHOLDS.visible;
}

// ============================================================
// EXPORT SERVICE SINGLETON
// ============================================================

const PortalService = {
    // Fuel
    calculateFuelReward,
    getRarityMultiplier,
    getRarityColor,

    // Temporal
    getTemporalState,
    getTemporalStateRemaining,
    getTemporalStateDisplay,

    // Visibility
    isPortalVisible,
    getCurrentVisibilityWindow,
    getNextVisibilityWindow,

    // Signal
    computeSignalStrength,
    getSignalStrengthLabel,

    // Locks
    createLockRecord,
    canAcceptMoreLocks,

    // Mystery
    isMysteryUnlocked,
    getMysteryColor,
    getMysteryDistanceLabel,
    isMysteryInRange,

    // Utility
    getDefaultPortalSettings,
};

export default PortalService;

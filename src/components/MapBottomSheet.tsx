import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { Post } from '../types';
import { RARITY_COLORS, SIGNAL_MODE_LABELS } from '../types/portal';
import LocationService from '../services/LocationService';
import PortalService from '../services/PortalService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab bar height is ~60 + safe area (~34) = ~94
const TAB_BAR_HEIGHT = 94;

const SNAP_POINTS = {
    COLLAPSED: SCREEN_HEIGHT - 180, // Showing just the "Nearby" header or small list
    PARTIAL: SCREEN_HEIGHT - 350,   // Showing half list
    DETAILS: SCREEN_HEIGHT - 520,   // Gamified detail view - higher to reveal button above tab bar
    EXPANDED: 150,                  // Partial expansion, not full screen
};

interface MapBottomSheetProps {
    posts: Post[];
    selectedPost: Post | null;
    onPostSelect: (post: Post) => void;
    onNavigate: (post: Post) => void;
    onCloseSelection: () => void;
}

export const MapBottomSheet = ({
    posts,
    selectedPost,
    onPostSelect,
    onNavigate,
    onCloseSelection
}: MapBottomSheetProps) => {
    const panY = useRef(new Animated.Value(SNAP_POINTS.COLLAPSED)).current;
    const [currentSnap, setCurrentSnap] = useState(SNAP_POINTS.COLLAPSED);
    const [userLoc, setUserLoc] = useState<{ lat: number, lon: number } | null>(null);

    useEffect(() => {
        LocationService.getCurrentLocation().then(loc => {
            if (loc) setUserLoc({ lat: loc.latitude, lon: loc.longitude });
        });
    }, []);

    // Effect: If a post is selected, snap to DETAILS view to show navigate button immediately
    useEffect(() => {
        if (selectedPost) {
            animateTo(SNAP_POINTS.DETAILS);
        } else {
            // If deselected, go back to collapsed ? Or stay ?
            // Let's stay provided we aren't fully expanded covering the map
        }
    }, [selectedPost]);

    const animateTo = (y: number) => {
        Animated.spring(panY, {
            toValue: y,
            useNativeDriver: false, // height/layout animation not supported by native driver usually
            friction: 7,
            tension: 40
        }).start(() => setCurrentSnap(y));
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only capture vertical swipes
                return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
            },
            onPanResponderGrant: () => {
                panY.extractOffset();
            },
            onPanResponderMove: Animated.event(
                [null, { dy: panY }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                panY.flattenOffset();

                // Determine next snap point
                const currentPos = currentSnap + gesture.dy;
                let nextPos = SNAP_POINTS.COLLAPSED;

                // Threshold logic
                if (gesture.vy < -0.5 || currentPos < SNAP_POINTS.PARTIAL - 100) {
                    nextPos = SNAP_POINTS.EXPANDED;
                } else if (currentPos < SNAP_POINTS.COLLAPSED - 100) {
                    nextPos = SNAP_POINTS.PARTIAL;
                } else {
                    nextPos = SNAP_POINTS.COLLAPSED;
                }

                animateTo(nextPos);
            }
        })
    ).current;

    const renderHeader = () => (
        <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={styles.handle} />
        </View>
    );

    const renderContent = () => {
        if (selectedPost) {
            // === GAMIFIED DETAIL VIEW ===
            const distKm = userLoc && selectedPost.locations?.[0]
                ? LocationService.calculateDistance(
                    userLoc.lat, userLoc.lon,
                    selectedPost.locations[0].latitude,
                    selectedPost.locations[0].longitude
                )
                : null;
            const distMeters = distKm !== null ? distKm * 1000 : 9999;
            const distDisplay = distKm !== null
                ? (distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`)
                : 'Unknown';
            // Estimate walking time: ~5km/h average = 12 min/km
            const walkMins = distKm !== null ? Math.round(distKm * 12) : null;

            // Portal Settings
            const settings = selectedPost.portalSettings;
            const rarity = settings?.rarity || 'Common';
            const signalMode = settings?.signalMode || 'AlwaysOn';
            const rarityColor = RARITY_COLORS[rarity];

            // Mystery Logic
            const isMystery = settings?.isMystery === true;
            const mysteryUnlocked = isMystery ? PortalService.isMysteryUnlocked(distMeters) : false;
            const mysteryColor = isMystery && !mysteryUnlocked ? PortalService.getMysteryColor(distMeters) : rarityColor;

            // Distance-based fuel reward
            const fuelReward = distKm !== null
                ? PortalService.calculateFuelReward(distKm, rarity)
                : (selectedPost.fuelReward || 50);

            // Temporal state
            const temporalState = PortalService.getTemporalState(selectedPost);
            const temporalDisplay = PortalService.getTemporalStateDisplay(selectedPost);
            const signalStrength = PortalService.computeSignalStrength(selectedPost);
            const signalLabel = PortalService.getSignalStrengthLabel(signalStrength);

            // Conditional Content
            const displayTitle = isMystery && !mysteryUnlocked ? 'Unknown Artifact' : (selectedPost.caption || 'Untitled Portal');
            const displayCreator = isMystery && !mysteryUnlocked ? '???' : (selectedPost.user?.username || 'creator');
            const displayImage = isMystery && !mysteryUnlocked ? null : (selectedPost.coverImage || selectedPost.mediaUri);

            return (
                <View style={styles.detailContainer}>
                    {/* Header row with back button */}
                    <View style={styles.detailHeader} {...panResponder.panHandlers}>
                        <TouchableOpacity onPress={onCloseSelection} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.detailTitle} numberOfLines={1}>
                            {isMystery && !mysteryUnlocked ? 'Signal Detected' : 'Portal Details'}
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>

                    {/* Rarity + Signal Status Banner */}
                    <View style={[styles.statusBanner, { borderColor: mysteryColor }]}>
                        <View style={[styles.rarityBadge, { backgroundColor: mysteryColor }]}>
                            <Ionicons
                                name={isMystery && !mysteryUnlocked ? 'help' : rarity === 'Anomaly' ? 'warning' : rarity === 'Mythic' ? 'star' : rarity === 'Rare' ? 'diamond' : 'ellipse'}
                                size={12}
                                color={rarity === 'Common' && !isMystery ? '#333' : '#fff'}
                            />
                            <Text style={[styles.rarityText, { color: rarity === 'Common' && !isMystery ? '#333' : '#fff' }]}>
                                {isMystery && !mysteryUnlocked ? 'MYSTERY' : rarity}
                            </Text>
                        </View>
                        <View style={styles.signalStatus}>
                            <View style={[styles.signalDot, { backgroundColor: isMystery && !mysteryUnlocked ? mysteryColor : (signalStrength > 60 ? theme.colors.primary : signalStrength > 30 ? theme.colors.warning : '#666') }]} />
                            <Text style={[styles.signalLabel, isMystery && !mysteryUnlocked && { color: mysteryColor, fontWeight: '700' }]}>
                                {isMystery && !mysteryUnlocked ? PortalService.getMysteryDistanceLabel(distMeters).split('-')[0].trim() : signalLabel}
                            </Text>
                        </View>
                        {!isMystery && (
                            <View style={styles.temporalBadge}>
                                <Ionicons
                                    name={temporalState === 'Peak' ? 'flash' : temporalState === 'Stabilizing' ? 'time' : 'timer'}
                                    size={12}
                                    color={temporalState === 'Peak' ? theme.colors.primary : temporalState === 'Decaying' ? theme.colors.error : theme.colors.textDim}
                                />
                                <Text style={[
                                    styles.temporalText,
                                    temporalState === 'Peak' && { color: theme.colors.primary },
                                    temporalState === 'Decaying' && { color: theme.colors.error },
                                ]}>
                                    {temporalDisplay}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Main Card: Thumbnail + Info */}
                    <View style={styles.portalCard}>
                        {displayImage ? (
                            <Image
                                source={{ uri: displayImage }}
                                style={[styles.portalThumb, { borderColor: mysteryColor, borderWidth: 2 }]}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.portalThumb, {
                                backgroundColor: '#000',
                                borderColor: mysteryColor,
                                borderWidth: 1,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }]}>
                                <Ionicons name="help" size={48} color={mysteryColor} />
                            </View>
                        )}

                        <View style={styles.portalInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[
                                    styles.portalName,
                                    isMystery && !mysteryUnlocked && { color: mysteryColor, fontStyle: 'italic' }
                                ]} numberOfLines={2}>
                                    {displayTitle}
                                </Text>
                                {selectedPost.isArtifact && !isMystery && (
                                    <View style={styles.artifactBadge}>
                                        <Ionicons name="diamond" size={12} color={theme.colors.secondary} />
                                        <Text style={styles.artifactBadgeText}>Artifact</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.portalCreator}>by @{displayCreator}</Text>

                            {/* Stats Row */}
                            <View style={styles.statBadges}>
                                <View style={styles.statBadge}>
                                    <Ionicons name="walk" size={14} color={mysteryColor} />
                                    <Text style={[styles.statBadgeText, { color: isMystery ? mysteryColor : theme.colors.textDim }]}>{distDisplay}</Text>
                                </View>
                                {walkMins !== null && (
                                    <View style={styles.statBadge}>
                                        <Ionicons name="time" size={14} color={theme.colors.textDim} />
                                        <Text style={styles.statBadgeText}>{walkMins} min</Text>
                                    </View>
                                )}
                                {!isMystery && (
                                    <View style={styles.statBadge}>
                                        <Ionicons name="radio" size={14} color={theme.colors.textDim} />
                                        <Text style={styles.statBadgeText}>{SIGNAL_MODE_LABELS[signalMode]}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Fuel Reward Banner - Distance Based */}
                    <View style={[styles.rewardBanner, temporalState === 'Peak' && !isMystery && styles.rewardBannerPeak, isMystery && { backgroundColor: mysteryColor + '10', borderColor: mysteryColor + '30' }]}>
                        <Ionicons name={isMystery ? "locate" : "flame"} size={24} color={isMystery ? mysteryColor : theme.colors.warning} />
                        <View style={styles.rewardInfo}>
                            <Text style={[styles.rewardTitle, isMystery && { color: mysteryColor }]}>
                                {isMystery ? 'PROXIMITY SIGNAL' : (temporalState === 'Peak' ? 'PEAK BONUS' : temporalState === 'Decaying' ? 'REDUCED REWARD' : 'FUEL Reward')}
                            </Text>
                            <Text style={[styles.rewardAmount, isMystery && { fontSize: 14, color: theme.colors.textDim }]}>
                                {isMystery ? PortalService.getMysteryDistanceLabel(distMeters) : `+${Math.round(fuelReward * (temporalState === 'Peak' ? 1.5 : temporalState === 'Decaying' ? 0.5 : 1))} XP`}
                            </Text>
                        </View>
                        {!isMystery && (
                            <View style={styles.rewardMultiplier}>
                                <Text style={styles.multiplierText}>{PortalService.getRarityMultiplier(rarity)}x</Text>
                                <Text style={styles.multiplierLabel}>Multiplier</Text>
                            </View>
                        )}
                    </View>

                    {/* Stabilizing Warning */}
                    {!isMystery && temporalState === 'Stabilizing' && (
                        <View style={styles.stabilizingWarning}>
                            <Ionicons name="hourglass" size={16} color={theme.colors.warning} />
                            <Text style={styles.stabilizingText}>
                                Portal is stabilizing. Wait to enter for full rewards.
                            </Text>
                        </View>
                    )}

                    {/* Navigate Button */}
                    <TouchableOpacity
                        style={[
                            styles.navigateButton,
                            temporalState === 'Stabilizing' && styles.navigateButtonDisabled,
                            isMystery && !mysteryUnlocked && { opacity: 0.8 }
                        ]}
                        onPress={() => onNavigate(selectedPost)}
                        disabled={temporalState === 'Stabilizing' || (isMystery && !mysteryUnlocked)}
                    >
                        <LinearGradientView>
                            <Ionicons name={isMystery && !mysteryUnlocked ? "lock-closed" : "navigate"} size={20} color="black" />
                            <Text style={styles.navigateText}>
                                {temporalState === 'Stabilizing' ? 'Wait...' : (isMystery && !mysteryUnlocked ? 'Get Closer to Unlock' : 'Start Journey')}
                            </Text>
                        </LinearGradientView>
                    </TouchableOpacity>
                </View>
            );
        }

        // === LIST VIEW (Nearby) ===
        return (
            <View style={styles.listContainer}>
                <View {...panResponder.panHandlers}>
                    <Text style={styles.sectionTitle}>Nearby Portals</Text>
                </View>
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {posts.map((post, idx) => {
                        // Get portal settings for this post
                        const postRarity = post.portalSettings?.rarity || 'Common';
                        const postSignalMode = post.portalSettings?.signalMode || 'AlwaysOn';
                        const postTemporalState = PortalService.getTemporalState(post);
                        const rarityColor = RARITY_COLORS[postRarity];
                        const isRare = postRarity !== 'Common';
                        const isMythic = postRarity === 'Mythic';
                        const isAnomaly = postRarity === 'Anomaly';
                        const isPeak = postTemporalState === 'Peak';
                        const isDecaying = postTemporalState === 'Decaying';

                        // Calculate distance in km and meters
                        const distKm = post.locations?.[0] && userLoc
                            ? LocationService.calculateDistance(
                                userLoc.lat, userLoc.lon,
                                post.locations[0].latitude,
                                post.locations[0].longitude
                            )
                            : null;
                        const distMeters = distKm !== null ? distKm * 1000 : 9999;

                        // MYSTERY PORTAL DETECTION
                        const isMystery = post.portalSettings?.isMystery === true;
                        const mysteryUnlocked = isMystery ? PortalService.isMysteryUnlocked(distMeters) : false;
                        const mysteryColor = isMystery && !mysteryUnlocked ? PortalService.getMysteryColor(distMeters) : rarityColor;

                        // Content Logic
                        const displayTitle = isMystery && !mysteryUnlocked ? 'Unknown Artifact' : (post.caption || 'Untitled Portal');
                        const displayCreator = isMystery && !mysteryUnlocked ? '???' : (post.user.username);
                        const displayFuel = isMystery && !mysteryUnlocked ? PortalService.getMysteryDistanceLabel(distMeters).split('-')[0].trim() : (distKm ? PortalService.calculateFuelReward(distKm, postRarity) : 50);

                        // Styles Logic
                        const cardBg = isMystery && !mysteryUnlocked ? mysteryColor + '10' :
                            isAnomaly ? 'rgba(244, 63, 94, 0.08)' :
                                isMythic ? 'rgba(168, 85, 247, 0.08)' :
                                    'rgba(255, 255, 255, 0.03)';

                        const borderColor = isMystery && !mysteryUnlocked ? mysteryColor + '40' :
                            isAnomaly ? rarityColor + '40' :
                                isMythic ? rarityColor + '30' :
                                    'rgba(255,255,255,0.05)';

                        // Signal Logic
                        const signalIcon = postSignalMode === 'FaintSignal' ? 'eye-off-outline' :
                            postSignalMode === 'Distorting' ? 'pulse' :
                                postSignalMode === 'LockedOn' ? 'lock-closed' : 'radio';
                        const signalColor = postSignalMode === 'LockedOn' ? '#F43F5E' :
                            postSignalMode === 'Distorting' ? '#F59E0B' :
                                postSignalMode === 'FaintSignal' ? '#A855F7' : '#22C55E';

                        const showUnlockedBadge = isMystery && mysteryUnlocked;

                        return (
                            <TouchableOpacity
                                key={post.id}
                                style={[
                                    styles.premiumCard,
                                    {
                                        backgroundColor: cardBg,
                                        borderColor: borderColor,
                                        borderWidth: 1,
                                    }
                                ]}
                                onPress={() => onPostSelect(post)}
                            >
                                {/* Left: 1:1 Full Height Image */}
                                <View style={styles.premiumThumbContainer}>
                                    {isMystery && !mysteryUnlocked ? (
                                        <View style={[styles.premiumThumb, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="help" size={32} color={mysteryColor} />
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: post.coverImage || post.mediaUri }}
                                            style={styles.premiumThumb}
                                            resizeMode="cover"
                                        />
                                    )}
                                    {/* Overlay Gradient or Tint? */}
                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />

                                    {/* Rarity Indicator (Small Pip) */}
                                    {(isRare || isMystery) && (
                                        <View style={[styles.premiumRarityPip, { backgroundColor: mysteryColor }]}>
                                            <Text style={styles.premiumRarityPipText}>
                                                {isMystery && !mysteryUnlocked ? '?' : postRarity[0]}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Right: Content */}
                                <View style={styles.premiumContent}>
                                    {/* Header: Rarity & Signal */}
                                    <View style={styles.premiumHeaderRow}>
                                        <View style={[styles.premiumBadge, { backgroundColor: mysteryColor + '20', borderColor: mysteryColor + '40', borderWidth: 0.5 }]}>
                                            <Text style={[styles.premiumBadgeText, { color: mysteryColor }]}>
                                                {isMystery && !mysteryUnlocked ? 'MYSTERY' : postRarity.toUpperCase()}
                                            </Text>
                                        </View>

                                        {!isMystery && (
                                            <View style={[styles.premiumBadge, { backgroundColor: 'transparent', paddingHorizontal: 0 }]}>
                                                <Ionicons name={signalIcon as any} size={10} color={signalColor} />
                                                <Text style={[styles.premiumBadgeText, { color: signalColor, marginLeft: 4 }]}>
                                                    {SIGNAL_MODE_LABELS[postSignalMode]}
                                                </Text>
                                            </View>
                                        )}

                                        {showUnlockedBadge && (
                                            <View style={[styles.premiumBadge, { backgroundColor: '#A855F7' }]}>
                                                <Text style={[styles.premiumBadgeText, { color: '#fff' }]}>FOUND</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Main Title */}
                                    <Text
                                        style={[
                                            styles.premiumTitle,
                                            isMystery && !mysteryUnlocked && { color: mysteryColor, fontStyle: 'italic', opacity: 0.9 }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {displayTitle}
                                    </Text>

                                    {/* Meta Row: User & Stats */}
                                    <View style={styles.premiumMetaRow}>
                                        <Text style={[styles.premiumSubtitle, isMystery && !mysteryUnlocked && { color: mysteryColor + '80' }]} numberOfLines={1}>
                                            @{displayCreator}
                                        </Text>
                                    </View>

                                    {/* Footer: Fuel & Dist */}
                                    <View style={styles.premiumFooter}>
                                        <View style={[
                                            styles.premiumFuelBadge,
                                            isMystery && !mysteryUnlocked && { backgroundColor: mysteryColor + '10' }
                                        ]}>
                                            <Ionicons
                                                name={isMystery ? "locate" : "flame"}
                                                size={12}
                                                color={isMystery ? mysteryColor : (isPeak ? '#FFD700' : theme.colors.warning)}
                                            />
                                            <Text style={[
                                                styles.premiumFuelText,
                                                isMystery && { color: mysteryColor },
                                                isPeak && !isMystery && { color: '#FFD700' }
                                            ]}>
                                                {displayFuel}
                                            </Text>
                                        </View>

                                        {!isMystery && (
                                            <>
                                                <Text style={styles.premiumDot}>•</Text>
                                                <Text style={styles.premiumDistanceText}>
                                                    {distKm !== null ? `${distKm.toFixed(1)} km` : '?'}
                                                </Text>
                                            </>
                                        )}

                                        {isPeak && !isMystery && (
                                            <View style={styles.premiumPeakBadge}>
                                                <Ionicons name="flash" size={8} color="#000" />
                                                <Text style={styles.premiumPeakText}>PEAK</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Chev */}
                                <View style={{ justifyContent: 'center', paddingRight: 12 }}>
                                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: panY }] }
            ]}
        >
            <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={StyleSheet.absoluteFill} />
            {renderHeader()}
            {renderContent()}
        </Animated.View>
    );
};

// Mock gradient wrapper if component not available in file
const LinearGradientView = ({ children }: { children: React.ReactNode }) => (
    <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 24,
        gap: 8,
        width: '100%'
    }}>
        {children}
    </View>
);

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT,
        backgroundColor: 'rgba(15, 15, 20, 0.65)', // More transparent for glass effect
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    handleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    handle: {
        width: 36,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 3,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        ...theme.typography.h2,
        fontSize: 22,
        color: theme.colors.white,
        marginBottom: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 12,
    },
    listThumb: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    listInfo: {
        flex: 1,
        marginLeft: 12,
    },
    listTitle: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    listSubtitle: {
        color: theme.colors.textDim,
        fontSize: 14,
    },
    listMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    metaText: {
        color: theme.colors.textDim,
        fontSize: 12,
        fontWeight: '500',
    },
    dot: {
        color: theme.colors.textDim,
        fontSize: 12,
    },
    // Detail
    detailContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    detailActionButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    detailTitle: {
        ...theme.typography.h2,
        color: theme.colors.white,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    // Compact inline layout
    inlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
        gap: 12,
    },
    inlineThumb: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    inlineInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    inlineStats: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    inlineStatText: {
        color: theme.colors.textDim,
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    detailImage: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        backgroundColor: '#222',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statText: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    detailDescription: {
        color: theme.colors.textDim,
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
    navigateButton: {
        width: '100%',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    navigateText: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    // Gamified Portal Card
    portalCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        gap: 12,
    },
    portalThumb: {
        width: 90,
        height: 90,
        borderRadius: 12,
        backgroundColor: '#333',
    },
    portalInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    portalName: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    portalCreator: {
        color: theme.colors.textDim,
        fontSize: 13,
        marginBottom: 8,
    },
    statBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statBadgeText: {
        color: theme.colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
    // Fuel Reward Banner
    rewardBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,200,0,0.15)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        gap: 10,
    },
    rewardInfo: {
        flex: 1,
    },
    rewardTitle: {
        color: theme.colors.warning,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    rewardAmount: {
        color: theme.colors.warning,
        fontSize: 22,
        fontWeight: '800',
    },
    rewardHint: {
        color: theme.colors.textDim,
        fontSize: 11,
        textAlign: 'right',
    },
    artifactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    artifactBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    // Gamified Portal Styles
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        gap: 8,
    },
    rarityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    rarityText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    signalStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    signalDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    signalStatusLabel: {
        color: theme.colors.textDim,
        fontSize: 11,
        fontWeight: '500',
    },
    temporalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    temporalText: {
        color: theme.colors.textDim,
        fontSize: 11,
        fontWeight: '600',
    },
    rewardBannerPeak: {
        backgroundColor: 'rgba(0, 255, 170, 0.2)',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    rewardMultiplier: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    multiplierText: {
        color: theme.colors.warning,
        fontSize: 16,
        fontWeight: '800',
    },
    multiplierLabel: {
        color: theme.colors.textDim,
        fontSize: 9,
        textTransform: 'uppercase',
    },
    stabilizingWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 200, 0, 0.1)',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        gap: 10,
    },
    stabilizingText: {
        flex: 1,
        color: theme.colors.warning,
        fontSize: 13,
    },
    navigateButtonDisabled: {
        opacity: 0.5,
    },
    // Gamified list styles
    listItemPeak: {
        backgroundColor: 'rgba(255, 215, 0, 0.08)',
        borderLeftWidth: 3,
        borderLeftColor: '#FFD700',
    },
    listThumbContainer: {
        position: 'relative',
    },
    listRarityBadge: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listRarityText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    fuelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(255, 140, 0, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    fuelBadgePeak: {
        backgroundColor: 'rgba(255, 215, 0, 0.25)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.5)',
    },
    fuelBadgeDecay: {
        backgroundColor: 'rgba(100, 100, 100, 0.15)',
    },
    fuelText: {
        color: theme.colors.warning,
        fontSize: 11,
        fontWeight: '700',
    },
    multiplierBadge: {
        fontSize: 9,
        fontWeight: '800',
        marginLeft: 2,
    },
    signalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    signalText: {
        fontSize: 10,
        fontWeight: '600',
    },
    peakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 6,
    },
    peakText: {
        color: '#FFD700',
        fontSize: 9,
        fontWeight: '800',
    },
    // New label styles for rarity and signal mode
    listItemAnomaly: {
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.3)',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rarityLabel: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    rarityLabelText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    signalLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    signalLabelText: {
        fontSize: 9,
        fontWeight: '500',
    },
    // Premium List Item Styles
    premiumCard: {
        flexDirection: 'row',
        height: 120,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#1E1E1E',
    },
    premiumThumbContainer: {
        width: 120,
        height: 120,
        position: 'relative',
    },
    premiumThumb: {
        width: '100%',
        height: '100%',
    },
    premiumRarityPip: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 20,
        height: 20,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    premiumRarityPipText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    premiumContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
        gap: 6,
    },
    premiumHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    premiumBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    premiumTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    premiumMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    premiumSubtitle: {
        color: theme.colors.textDim,
        fontSize: 13,
    },
    premiumFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    premiumFuelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    premiumFuelText: {
        color: theme.colors.warning,
        fontSize: 13,
        fontWeight: '700',
    },
    premiumDot: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
    },
    premiumDistanceText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: '500',
    },
    premiumPeakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFD700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 'auto',
    },
    premiumPeakText: {
        color: '#000',
        fontSize: 9,
        fontWeight: '800',
    },
});

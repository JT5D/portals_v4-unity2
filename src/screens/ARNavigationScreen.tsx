import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, Modal, Animated } from 'react-native';
import { ViroARScene, ViroARSceneNavigator, ViroText, ViroBox, ViroMaterials, ViroAmbientLight, ViroNode, ViroImage, Viro3DObject, ViroVideo } from '@reactvision/react-viro';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import LocationService, { GeoCoordinate } from '../services/LocationService';
import FuelService from '../services/FuelService';
import { NavigationHUD } from '../components/NavigationHUD';

ViroMaterials.createMaterials({
    fuel_material: {
        diffuseColor: theme.colors.warning
    },
});

// Scene Component with Geospatial Anchoring
const ARNavigationScene = (props?: any) => {
    // Props passed via Viro's props mechanism
    // ViroARSceneNavigator passes BOTH sceneNavigator and arSceneNavigator to scenes
    // arSceneNavigator contains the geospatial methods
    const viroAppProps = props.sceneNavigator?.viroAppProps || props.arSceneNavigator?.viroAppProps || {};
    const { targetLat, targetLon, targetAltitude, targetImage, onCollection, isCollected } = viroAppProps;

    // Try both navigators - one should have geospatial methods
    const sceneNav = props.sceneNavigator;
    const arNav = props.arSceneNavigator;

    // Debug: Log what's available
    useEffect(() => {
        console.log('[AR Debug] sceneNavigator keys:', sceneNav ? Object.keys(sceneNav) : 'undefined');
        console.log('[AR Debug] arSceneNavigator keys:', arNav ? Object.keys(arNav) : 'undefined');
        console.log('[AR Debug] sceneNav.isGeospatialModeSupported:', typeof sceneNav?.isGeospatialModeSupported);
        console.log('[AR Debug] arNav.isGeospatialModeSupported:', typeof arNav?.isGeospatialModeSupported);
    }, [sceneNav, arNav]);

    // Use whichever navigator has geospatial methods
    const geoNav = arNav?.isGeospatialModeSupported ? arNav :
        sceneNav?.isGeospatialModeSupported ? sceneNav : null;

    const [anchorPosition, setAnchorPosition] = useState<[number, number, number] | null>(null);
    const [trackingStatus, setTrackingStatus] = useState<string>("Initializing...");
    const [visible, setVisible] = useState(true);
    const anchorIdRef = useRef<string | null>(null);

    const _onInitialized = (state: any, reason: any) => {
        console.log("[AR] Tracking State:", state);
    };

    // Enable Geospatial and Create Anchor
    useEffect(() => {
        if (!targetLat || !targetLon) return;

        const initGeospatial = async () => {
            try {
                // Check if geoNav has geospatial methods
                if (!geoNav?.isGeospatialModeSupported) {
                    console.log('[Geospatial] No geospatial navigator found, using simple fallback');
                    setTrackingStatus('');
                    setAnchorPosition([0, 0, -5]); // Show content 5m in front
                    return;
                }

                // 1. Check if geospatial is supported
                const support = await geoNav.isGeospatialModeSupported();
                if (!support?.supported) {
                    console.warn("[Geospatial] Not supported:", support?.error);
                    setTrackingStatus('');
                    setAnchorPosition([0, 0, -5]);
                    return;
                }

                // 2. Enable geospatial mode
                geoNav.setGeospatialModeEnabled(true);
                setTrackingStatus("Acquiring location...");

                // 3. Wait for good tracking before placing anchor
                let attempts = 0;
                const maxAttempts = 30;

                const checkTracking = async (): Promise<boolean> => {
                    const result = await geoNav.getCameraGeospatialPose();
                    if (result?.success && result?.pose) {
                        const { horizontalAccuracy } = result.pose;
                        setTrackingStatus(`Accuracy: ±${horizontalAccuracy?.toFixed(1)}m`);
                        return horizontalAccuracy < 10; // 10m threshold
                    }
                    return false;
                };

                while (attempts < maxAttempts) {
                    const isReady = await checkTracking();
                    if (isReady) break;
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }

                // 4. Create anchor based on available data
                let anchorResult;

                if (targetAltitude !== undefined && targetAltitude !== null) {
                    console.log('[Geospatial] Creating WGS84 anchor with altitude:', targetAltitude);
                    anchorResult = await geoNav.createGeospatialAnchor(
                        targetLat,
                        targetLon,
                        targetAltitude + 2.0,
                        [0, 0, 0, 1]
                    );
                } else {
                    console.log('[Geospatial] Creating terrain anchor (no altitude data)');
                    anchorResult = await geoNav.createTerrainAnchor(
                        targetLat,
                        targetLon,
                        2.0
                    );
                }

                if (anchorResult?.success && anchorResult?.anchor) {
                    console.log('[Geospatial] Anchor created:', anchorResult.anchor);
                    setAnchorPosition(anchorResult.anchor.position);
                    anchorIdRef.current = anchorResult.anchor.anchorId;
                    setTrackingStatus('');
                } else {
                    console.warn('[Geospatial] Anchor creation failed:', anchorResult?.error);
                    setTrackingStatus('');
                    setAnchorPosition([0, 0, -5]);
                }

            } catch (error) {
                console.error("[Geospatial] Init error:", error);
                setTrackingStatus('');
                setAnchorPosition([0, 0, -5]);
            }
        };

        initGeospatial();

        return () => {
            if (anchorIdRef.current && geoNav?.removeGeospatialAnchor) {
                geoNav.removeGeospatialAnchor(anchorIdRef.current);
            }
            if (geoNav?.setGeospatialModeEnabled) {
                geoNav.setGeospatialModeEnabled(false);
            }
        };
    }, [targetLat, targetLon, geoNav]);

    // Collection logic
    useEffect(() => {
        const handleUpdate = (loc: GeoCoordinate) => {
            if (!targetLat || !targetLon) return;

            const distKm = LocationService.calculateDistance(loc.latitude, loc.longitude, targetLat, targetLon);
            const distM = distKm * 1000;

            if (distM < 15 && !isCollected) {
                onCollection && onCollection();
                setVisible(false);
            }
        };

        const sub = LocationService.on('location_update', handleUpdate);
        return () => {
            if (sub?.off) sub.off('location_update', handleUpdate);
            else LocationService.removeListener('location_update', handleUpdate);
        };
    }, [targetLat, targetLon, isCollected]);

    // Render content logic
    const renderContent = () => {
        if (!targetImage) return null;

        const isModel = targetImage.endsWith('.vrx') || targetImage.endsWith('.obj') || targetImage.endsWith('.glb');
        const isVideo = targetImage.endsWith('.mp4') || targetImage.endsWith('.mov');

        if (isModel) {
            return (
                <ViroNode position={[0, 0, 0]} scale={[0.3, 0.3, 0.3]}>
                    <Viro3DObject
                        source={{ uri: targetImage }}
                        type={targetImage.endsWith('.vrx') ? "VRX" : targetImage.endsWith('.obj') ? "OBJ" : "GLB"}
                        animation={{ name: "01", run: true, loop: true }}
                    />
                </ViroNode>
            );
        } else if (isVideo) {
            return (
                <ViroVideo
                    source={{ uri: targetImage }}
                    loop={true}
                    position={[0, 1, 0]}
                    scale={[1.2, 0.7, 1]}
                />
            );
        } else {
            return (
                <ViroImage
                    source={{ uri: targetImage }}
                    height={1}
                    width={1.5}
                    position={[0, 1, 0]}
                />
            );
        }
    };

    return (
        <ViroARScene onTrackingUpdated={_onInitialized}>
            <ViroAmbientLight color="#ffffff" />

            {/* Status Text (only show when there's a message) */}
            {trackingStatus !== '' && (
                <ViroText
                    text={trackingStatus}
                    position={[0, 0.5, -2]}
                    style={{ ...styles.arTextStyle, fontSize: 12 }}
                    scale={[0.3, 0.3, 0.3]}
                />
            )}

            {/* Portal Content */}
            {visible && anchorPosition && (
                <ViroNode position={anchorPosition}>
                    {renderContent()}
                </ViroNode>
            )}
        </ViroARScene>
    );
};

export const ARNavigationScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const target = route.params?.target;

    // UseRef to keep persistent across renders for Viro
    const stateRef = useRef({
        collected: false
    });
    const [forceUpdate, setForceUpdate] = useState(0);
    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const [fuelAwarded, setFuelAwarded] = useState(0);

    // Initial listener to start services is still good to ensure tracking is on
    useEffect(() => {
        LocationService.startTracking();
        LocationService.startHeadingTracking();
        return () => {
            LocationService.stopHeadingTracking();
        };
    }, []);

    const handleCollection = () => {
        if (stateRef.current.collected) return;
        stateRef.current.collected = true;
        setForceUpdate(h => h + 1);

        // Award Logic
        const reward = target?.fuelReward || 100;
        FuelService.awardFuel(reward, `Found: ${target?.caption}`);
        setFuelAwarded(reward);

        // Show arrival modal instead of Alert
        setShowArrivalModal(true);
    };

    const handleLaunchScene = () => {
        setShowArrivalModal(false);

        // Check if this is an artifact - route to clean viewer
        if (target?.isArtifact) {
            navigation.replace('ArtifactViewer', {
                post: target,
            });
        } else {
            // Navigate to Figment AR editor with the scene data
            // Uses the same pattern as FeedItem remix button - loads scene via _loadRemixScene
            navigation.replace('Figment', {
                postData: target,
                isRemix: true, // Required to trigger scene loading in FigmentAR
            });
        }
    };

    const handleDismiss = () => {
        setShowArrivalModal(false);
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <ViroARSceneNavigator
                autofocus={true}
                initialScene={{
                    scene: ARNavigationScene,
                }}
                viroAppProps={{
                    targetLat: target?.locations?.[0]?.latitude,
                    targetLon: target?.locations?.[0]?.longitude,
                    targetAltitude: target?.locations?.[0]?.altitude, // For WGS84 anchors
                    targetImage: target?.mediaUri || target?.coverImage,
                    onCollection: handleCollection,
                    isCollected: stateRef.current.collected
                }}
                style={styles.arView}
            />

            <View style={styles.overlay}>
                <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>

                {/* PREMIUM HUD */}
                {!stateRef.current.collected && (
                    <NavigationHUD
                        target={target}
                    />
                )}
            </View>

            {/* Arrival Reward Modal */}
            <Modal
                visible={showArrivalModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Celebration Icon */}
                        <View style={styles.celebrationIcon}>
                            <Ionicons name="trophy" size={48} color={theme.colors.warning} />
                        </View>

                        {/* Title */}
                        <Text style={styles.modalTitle}>Portal Found!</Text>

                        {/* Reward Display */}
                        <View style={styles.rewardContainer}>
                            <Ionicons name="flame" size={28} color={theme.colors.warning} />
                            <Text style={styles.rewardText}>+{fuelAwarded} Fuel</Text>
                        </View>

                        {/* Portal Info */}
                        <Text style={styles.portalCaption} numberOfLines={2}>
                            {target?.caption || 'Untitled Portal'}
                        </Text>

                        {/* Action Buttons */}
                        <View style={styles.modalButtons}>
                            {target?.sceneId || target?.sceneData ? (
                                <TouchableOpacity
                                    style={styles.launchButton}
                                    onPress={handleLaunchScene}
                                >
                                    <Ionicons name="play-circle" size={24} color="black" />
                                    <Text style={styles.launchButtonText}>Launch Scene</Text>
                                </TouchableOpacity>
                            ) : null}

                            <TouchableOpacity
                                style={styles.dismissButton}
                                onPress={handleDismiss}
                            >
                                <Text style={styles.dismissButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    arView: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 24,
    },
    closeButton: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 10,
        marginTop: 40,
    },
    footer: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
    },
    targetTitle: {
        color: theme.colors.warning,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    hintText: {
        color: '#ccc',
        fontSize: 14,
    },
    arTextStyle: {
        fontFamily: 'Arial',
        fontSize: 20,
        color: '#ffffff',
        textAlignVertical: 'center',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    hudContainer: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 16,
        borderRadius: 20,
        gap: 8
    },
    hudText: {
        color: theme.colors.warning,
        fontSize: 24,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    // Arrival Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
    },
    celebrationIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
    },
    rewardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    rewardText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.warning,
    },
    portalCaption: {
        fontSize: 16,
        color: theme.colors.textDim,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtons: {
        width: '100%',
        gap: 12,
    },
    launchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 30,
    },
    launchButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
    },
    dismissButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dismissButtonText: {
        fontSize: 16,
        color: theme.colors.textDim,
    },
});

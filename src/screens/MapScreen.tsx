import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAppStore } from '../store';
import { Post } from '../types';
import LocationService, { GeoCoordinate } from '../services/LocationService';
import FuelService from '../services/FuelService';
import { MapBottomSheet } from '../components/MapBottomSheet';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

// Custom Map Style (Dark/Cinematic)
const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

export const MapScreen = () => {
    const navigation = useNavigation<any>();
    const feed = useAppStore(state => state.feed);
    const currentUser = useAppStore(state => state.currentUser);
    const mapRef = useRef<MapView>(null);

    // State
    const [userLocation, setUserLocation] = useState<GeoCoordinate | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [navTarget, setNavTarget] = useState<Post | null>(null);
    const [fuelEarnedSession, setFuelEarnedSession] = useState(0);
    const [isTracking, setIsTracking] = useState(false);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
    const [initialRegion, setInitialRegion] = useState<any>(null);

    // Filter posts with location
    const postsWithLocation = useMemo(() =>
        feed.filter(p => p.locations && p.locations.length > 0),
        [feed]);

    // ... (fetchWalkingRoute kept as is)

    // Initialize Services
    useEffect(() => {
        const init = async () => {
            const success = await LocationService.startTracking();
            setIsTracking(success);

            // Get initial fix
            const loc = await LocationService.getCurrentLocation();
            if (loc) {
                const region = {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015
                };
                setUserLocation(loc);
                setInitialRegion(region);
            } else {
                // Fallback to default (SF) if location fails
                const defaultRegion = {
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                };
                setInitialRegion(defaultRegion);
            }
        };

        init();
        if (currentUser?.id) FuelService.setUserId(currentUser.id);

        // Listeners
        const handleLocUpdate = (loc: GeoCoordinate) => {
            setUserLocation(loc);
            // If we somehow didn't get an initial region (e.g. race condition), set it now
            setInitialRegion((prev: any) => prev || {
                latitude: loc.latitude,
                longitude: loc.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015
            });
        };
        LocationService.on('location_update', handleLocUpdate);

        // ... (rest of listeners)
    }, [currentUser?.id]);

    // Handlers
    const handleNavigate = async (post: Post) => {
        setNavTarget(post);

        // Fetch walking route if we have locations
        if (userLocation && post.locations?.[0]) {
            const origin = { latitude: userLocation.latitude, longitude: userLocation.longitude };
            const destination = { latitude: post.locations[0].latitude, longitude: post.locations[0].longitude };

            // Fetch walking directions
            const route = await fetchWalkingRoute(origin, destination);
            setRouteCoordinates(route);

            // Zoom to show route
            if (route.length > 0) {
                mapRef.current?.fitToCoordinates(route, {
                    edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
                    animated: true
                });
            }
        }
    };

    const handleEnterAR = () => {
        // Navigate to the new ARNavigationScreen
        navigation.navigate('ARNavigation', { target: navTarget || selectedPost });
    };

    if (!initialRegion) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                {/* HUD or Loading or simply background in dark mode */}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                userInterfaceStyle="dark"
                showsUserLocation
                showsCompass={false}
                rotateEnabled={false}
                initialRegion={initialRegion}
            >
                {/* POI Markers */}
                {postsWithLocation.map((post, index) => (
                    <Marker
                        key={`${post.id}-${index}`}
                        coordinate={{
                            latitude: post.locations![0].latitude,
                            longitude: post.locations![0].longitude
                        }}
                        onPress={() => setSelectedPost(post)}
                    >
                        <View style={styles.markerContainer}>
                            {post.isArtifact ? (
                                // Diamond marker for artifacts
                                <View style={[styles.markerDot, styles.artifactMarker, selectedPost?.id === post.id && styles.markerActive]}>
                                    <Ionicons name="diamond" size={14} color="black" />
                                </View>
                            ) : (
                                <View style={[styles.markerDot, selectedPost?.id === post.id && styles.markerActive]} />
                            )}
                            <View style={[styles.markerStem, post.isArtifact && styles.artifactStem]} />
                        </View>
                    </Marker>
                ))}

                {/* Navigation Route (Walking Directions) */}
                {navTarget && routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={theme.colors.primary}
                        strokeWidth={4}
                        lineDashPattern={[0]} // Solid line for actual route
                    />
                )}
            </MapView>

            {/* Dynamic Island HUD */}
            <SafeAreaView style={styles.hudContainer} pointerEvents="box-none">
                <BlurView intensity={30} tint="dark" style={styles.statusPill}>
                    <View style={styles.fuelBadge}>
                        <Ionicons name="flame" size={16} color={theme.colors.warning} />
                        <Text style={styles.fuelText}>
                            {((currentUser?.fuelBalance || 0) + fuelEarnedSession).toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.scanButton}>
                        <Ionicons name="scan-circle" size={20} color={theme.colors.white} />
                        <Text style={styles.scanText}>Scan Area</Text>
                    </TouchableOpacity>
                </BlurView>
            </SafeAreaView>

            {/* Mode Switcher / AR FAB */}
            <View style={styles.fabContainer} pointerEvents="box-none">
                <TouchableOpacity style={styles.arFab} onPress={handleEnterAR}>
                    <Ionicons name="camera" size={28} color="black" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.locateFab}
                    onPress={() => {
                        if (userLocation) {
                            mapRef.current?.animateToRegion({
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005
                            });
                        }
                    }}
                >
                    <Ionicons name="navigate" size={22} color="white" />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet */}
            <MapBottomSheet
                posts={postsWithLocation}
                selectedPost={selectedPost}
                onPostSelect={setSelectedPost}
                onNavigate={handleNavigate}
                onCloseSelection={() => setSelectedPost(null)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    // Markers
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        width: 40,
    },
    markerDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
        borderWidth: 3,
        borderColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    markerActive: {
        backgroundColor: theme.colors.warning,
        borderColor: theme.colors.warning,
        transform: [{ scale: 1.2 }],
    },
    markerStem: {
        width: 2,
        height: 10,
        backgroundColor: theme.colors.primary,
        marginTop: -2,
    },
    artifactMarker: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    artifactStem: {
        backgroundColor: theme.colors.secondary,
    },
    // HUD
    hudContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 10 : 0,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 30,
        paddingHorizontal: 6,
        paddingVertical: 6,
        gap: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 8,
    },
    fuelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
    },
    fuelText: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingRight: 8,
        paddingLeft: 4,
    },
    scanText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    // FABs
    fabContainer: {
        position: 'absolute',
        right: 16,
        bottom: Platform.OS === 'ios' ? 220 : 200, // Above bottom sheet collapsed height
        alignItems: 'center',
        gap: 16,
    },
    arFab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.warning, // Pokemon Go style active color
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    locateFab: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(30,30,30,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
});

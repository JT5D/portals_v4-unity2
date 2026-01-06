import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, TextInput, Keyboard, Platform } from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';

const { width, height } = Dimensions.get('window');

// Custom Map Style (Dark/Monochromatic)
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

export const LocationPickerScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const mapRef = useRef<MapView>(null);
    const updateDraftPost = useAppStore(state => state.updateDraftPost);
    const draftPost = useAppStore(state => state.draftPost);

    // Default region (Los Angeles)
    const [region, setRegion] = useState<Region>({
        latitude: 34.0522,
        longitude: -118.2437,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    const [selectedLocations, setSelectedLocations] = useState<any[]>(draftPost?.locations || []);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permission to access location was denied');
                    return;
                }

                // Try last known first (faster)
                let location = await Location.getLastKnownPositionAsync({});
                if (location) {
                    const userRegion = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    };
                    setRegion(userRegion);
                    mapRef.current?.animateToRegion(userRegion, 1000);
                }

                // Then try high accuracy
                let currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (currentLoc) {
                    const userRegion = {
                        latitude: currentLoc.coords.latitude,
                        longitude: currentLoc.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    };
                    setRegion(userRegion);
                    mapRef.current?.animateToRegion(userRegion, 1000);
                }
            } catch (e) {
                console.log("Location Error:", e);
            }
        })();
    }, []);

    const goToMyLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const userRegion = {
                latitude: currentLoc.coords.latitude,
                longitude: currentLoc.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            setRegion(userRegion);
            mapRef.current?.animateToRegion(userRegion, 1000);
        } catch (error) {
            console.log("Manual Location Error", error);
        }
    };

    const handleRegionChange = (newRegion: Region) => {
        setRegion(newRegion);
    };

    const handleAddCurrentLocation = async () => {
        // Use the map's current center position (where the crosshairs are)
        // NOT the user's GPS location - this allows dropping pins anywhere on the map
        const newLoc = {
            latitude: region.latitude,
            longitude: region.longitude,
            name: searchQuery || 'Pinned Location'
        };

        console.log('[LocationPicker] Dropping pin at map center:', newLoc);
        setSelectedLocations([...selectedLocations, newLoc]);
        setSearchQuery('');
    };

    const handleRemoveLocation = (index: number) => {
        const newLocs = [...selectedLocations];
        newLocs.splice(index, 1);
        setSelectedLocations(newLocs);
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 2) {
            setIsSearching(true);
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5`, {
                    headers: {
                        'User-Agent': 'PortalsApp/1.0'
                    }
                });
                const data = await response.json();
                setSearchResults(data);
            } catch (error) {
                console.error("Geocoding error", error);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSelectResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const name = result.display_name.split(',')[0];

        const newRegion = {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        setSearchResults([]);
        setSearchQuery(name); // Set Name for next pin drop
        Keyboard.dismiss();
    };

    const handleFinish = () => {
        updateDraftPost({ locations: selectedLocations });
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={region}
                onRegionChangeComplete={handleRegionChange}
                showsUserLocation
                customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
                userInterfaceStyle="dark"
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            >
                {selectedLocations.map((loc, index) => (
                    <Marker
                        key={index}
                        coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                        title={loc.name}
                        pinColor={theme.colors.primary}
                        onCalloutPress={() => handleRemoveLocation(index)}
                    >
                    </Marker>
                ))}
            </MapView>

            {/* Center Fixed Marker */}
            <View style={styles.centerMarkerContainer} pointerEvents="none">
                <Ionicons name="location-sharp" size={50} color={theme.colors.primary} style={styles.centerPinIcon} />
                <View style={styles.pinShadow} />
            </View>

            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={20} color={theme.colors.textDim} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search address..."
                                placeholderTextColor={theme.colors.textDim}
                                value={searchQuery}
                                onChangeText={handleSearch}
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {searchResults.length > 0 && (
                        <View style={styles.resultsList}>
                            {searchResults.map((result, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.resultItem}
                                    onPress={() => handleSelectResult(result)}
                                >
                                    <Ionicons name="location-outline" size={20} color={theme.colors.textDim} />
                                    <Text style={styles.resultText} numberOfLines={1}>
                                        {result.display_name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.dummySpacer} />

                {/* My Location Button */}
                <TouchableOpacity
                    style={styles.myLocationButton}
                    onPress={goToMyLocation}
                >
                    <Ionicons name="locate" size={24} color="black" />
                </TouchableOpacity>

                <View style={styles.footer}>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.actionButton, styles.dropButton]} onPress={handleAddCurrentLocation}>
                            <Ionicons name="add-circle" size={24} color="black" />
                            <Text style={styles.dropButtonText}>Drop Pin</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.confirmButton,
                                selectedLocations.length === 0 && styles.disabledButton
                            ]}
                            onPress={handleFinish}
                            disabled={selectedLocations.length === 0}
                        >
                            <Text style={styles.confirmButtonText}>
                                {selectedLocations.length > 0 ? `Done (${selectedLocations.length})` : 'Done'}
                            </Text>
                            <Ionicons name="checkmark-sharp" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
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
    centerMarkerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        pointerEvents: 'none',
    },
    centerPinIcon: {
        marginBottom: 40, // Offset to make the point of the pin land on center
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    pinShadow: {
        width: 10,
        height: 4,
        borderRadius: 5,
        backgroundColor: 'rgba(0,0,0,0.3)',
        marginTop: -10, // Adjust relative to icon
    },
    overlay: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    searchContainer: {
        margin: theme.spacing.m,
        zIndex: 100,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.s,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    backButton: {
        padding: 6,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: 'black',
        paddingVertical: 8,
    },
    resultsList: {
        marginTop: 8,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 8,
        maxHeight: 250,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    resultText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    dummySpacer: {
        flex: 1,
    },
    myLocationButton: {
        alignSelf: 'flex-end',
        marginRight: 16,
        marginBottom: 16,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 30,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    footer: {
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.xl,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    dropButton: {
        backgroundColor: theme.colors.primary,
    },
    confirmButton: {
        backgroundColor: '#2ecc71',
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
        opacity: 0.8,
    },
    dropButtonText: {
        color: 'black',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

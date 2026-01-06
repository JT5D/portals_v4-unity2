import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// Canvas-based Noise Overlay Component using WebView
const NoiseOverlay = () => {
    const noiseHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; }
                body { background: transparent; overflow: hidden; }
                canvas { 
                    position: fixed; 
                    top: 0; 
                    left: 0; 
                    width: 100vw; 
                    height: 100vh;
                    image-rendering: pixelated;
                    pointer-events: none;
                }
            </style>
        </head>
        <body>
            <canvas id="noise"></canvas>
            <script>
                const canvas = document.getElementById('noise');
                const ctx = canvas.getContext('2d', { alpha: true });
                const size = 512;
                canvas.width = size;
                canvas.height = size;
                
                let frame = 0;
                const refreshInterval = 3;
                const alpha = 12;
                
                function drawNoise() {
                    const imageData = ctx.createImageData(size, size);
                    const data = imageData.data;
                    
                    for (let i = 0; i < data.length; i += 4) {
                        const value = Math.random() * 255;
                        data[i] = value;
                        data[i + 1] = value;
                        data[i + 2] = value;
                        data[i + 3] = alpha;
                    }
                    
                    ctx.putImageData(imageData, 0, 0);
                }
                
                function loop() {
                    if (frame % refreshInterval === 0) {
                        drawNoise();
                    }
                    frame++;
                    requestAnimationFrame(loop);
                }
                
                loop();
            </script>
        </body>
        </html>
    `;

    return (
        <View style={styles.noiseContainer} pointerEvents="none">
            <WebView
                source={{ html: noiseHTML }}
                style={styles.noiseWebView}
                scrollEnabled={false}
                pointerEvents="none"
                backgroundColor="transparent"
                originWhitelist={['*']}
            />
        </View>
    );
};

// Animated Orb Component for morphing gradient effect
const AnimatedOrb = ({ color, size, initialX, initialY, duration }: {
    color: string;
    size: number;
    initialX: number;
    initialY: number;
    duration: number;
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.85)).current;

    useEffect(() => {
        const animateOrb = () => {
            Animated.loop(
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(translateX, {
                            toValue: Math.random() * 200 - 100,
                            duration: duration,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: Math.random() * -200 + 100,
                            duration: duration * 1.2,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(translateY, {
                            toValue: Math.random() * 150 - 75,
                            duration: duration * 0.9,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateY, {
                            toValue: Math.random() * -150 + 75,
                            duration: duration * 1.1,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(scale, {
                            toValue: 1.3,
                            duration: duration * 1.5,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scale, {
                            toValue: 0.8,
                            duration: duration * 1.3,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(opacity, {
                            toValue: 1.0,
                            duration: duration,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0.7,
                            duration: duration * 1.2,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            ).start();
        };
        animateOrb();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: initialX,
                top: initialY,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: size,
            }}
        />
    );
};

export const ComposerEntryScreen = () => {
    const navigation = useNavigation<any>();
    const drafts = useAppStore(state => state.drafts);
    const fetchDrafts = useAppStore(state => state.fetchDrafts);
    const currentUser = useAppStore(state => state.currentUser);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchDrafts();
        });
        return unsubscribe;
    }, [navigation]);
    const [activeTab, setActiveTab] = React.useState<'Drafts' | 'Collabs'>('Drafts');

    // Filter drafts into solo drafts and collabs based on collaborators
    const { myDrafts, collabs } = useMemo(() => {
        const currentUserId = currentUser?.id;

        // Collabs = drafts that have collaborators (regardless of ownership)
        const collabDrafts = drafts.filter(d => {
            const hasCollaborators = (d.collaborators?.length || 0) > 0;
            return hasCollaborators;
        });

        // My drafts = drafts I own with no collaborators (solo work)
        const soloOwned = drafts.filter(d =>
            d.ownerId === currentUserId && (d.collaborators?.length || 0) === 0
        );

        return { myDrafts: soloOwned, collabs: collabDrafts };
    }, [drafts, currentUser?.id]);

    const currentData = activeTab === 'Drafts' ? myDrafts : collabs;

    const loadDraft = useAppStore(state => state.loadDraft);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleDraftPress = async (item: any) => {
        if (isLoading) return;

        let draftData = item.sceneData;

        // Lazy load if missing and we have a sceneId
        if (!draftData && item.sceneId) {
            try {
                setIsLoading(true);
                await loadDraft(item);
                const updatedDraft = useAppStore.getState().draftPost;
                draftData = updatedDraft?.sceneData;
            } catch (e) {
                console.error("Failed to load draft", e);
            } finally {
                setIsLoading(false);
            }
        }

        // Safety check - provide fallback empty scene if no data
        if (!draftData) {
            console.warn('[ComposerEntry] No sceneData for draft, using empty scene');
            draftData = { objects: [], sceneType: 'figment_ar' };
        }

        // Navigate to Figment AR editor with draft data
        navigation.navigate('Figment', {
            draftData: draftData,
            draftTitle: item.title || "Untitled",
            draftId: item.id
        });
    };

    const renderDraft = ({ item }: { item: any }) => {
        // coverImage is now a proper R2 URL from fetchDrafts (mapped from previewPath)
        const imageUrl = item.coverImage;

        return (
            <TouchableOpacity
                style={[styles.draftCard, isLoading && { opacity: 0.7 }]}
                onPress={() => handleDraftPress(item)}
                disabled={isLoading}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={[styles.draftPreview, { marginBottom: 8 }]} />
                ) : (
                    <View style={styles.draftPreview} />
                )}
                <Text style={styles.draftTitle} numberOfLines={1}>{item.title || "Untitled"}</Text>
                <Text style={styles.draftDate}>{new Date(item.updatedAt || Date.now()).toLocaleDateString()}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Base dark gradient */}
            <LinearGradient
                colors={['#0a0a0f', '#0f0a1a', '#050510', '#000000']}
                locations={[0, 0.3, 0.7, 1]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Animated morphing orbs - blue/purple/pink/magenta palette */}
            <View style={styles.orbContainer} pointerEvents="none">
                <AnimatedOrb color="#ff0080" size={320} initialX={width * 0.1} initialY={height * 0.15} duration={8000} />
                <AnimatedOrb color="#00d4ff" size={280} initialX={width * 0.8} initialY={height * 0.35} duration={10000} />
                <AnimatedOrb color="#aa00ff" size={300} initialX={width * 0.5} initialY={height * 0.08} duration={7000} />
                <AnimatedOrb color="#6600ff" size={340} initialX={width * 0.3} initialY={height * 0.28} duration={12000} />
                <AnimatedOrb color="#ff00aa" size={260} initialX={width * 0.7} initialY={height * 0.18} duration={9000} />
                <AnimatedOrb color="#00e5cc" size={160} initialX={width * 0.4} initialY={height * 0.4} duration={11000} />
            </View>

            {/* Double blur overlay for maximum softness */}
            <BlurView intensity={100} tint="default" style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <BlurView intensity={100} tint="default" style={StyleSheet.absoluteFillObject} />
            </BlurView>

            {/* Canvas-based noise overlay */}
            <NoiseOverlay />

            {/* Dark fade at bottom */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)', '#000000']}
                locations={[0.3, 0.6, 1]}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Centered hero text */}
                <View style={styles.heroContainer}>
                    <Text style={styles.heroText}>Create Something.</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.tabs}>
                        <TouchableOpacity onPress={() => setActiveTab('Drafts')}>
                            <Text style={activeTab === 'Drafts' ? styles.activeTab : styles.inactiveTab}>Drafts</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setActiveTab('Collabs')}>
                            <Text style={activeTab === 'Collabs' ? styles.activeTab : styles.inactiveTab}>Collabs</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 200, marginTop: 20 }}>
                        <FlatList
                            horizontal
                            data={[{ id: 'new', title: 'New' }, ...currentData]}
                            renderItem={({ item }) => {
                                if (item.id === 'new') {
                                    return (
                                        <View style={{ alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('Figment')}>
                                                <View style={styles.addCircle}>
                                                    <Ionicons name="add" size={28} color="#000" />
                                                </View>
                                                <Text style={styles.cardText}>New draft</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.unityButton} onPress={() => navigation.navigate('UnityTestScene')}>
                                                <Ionicons name="cube-outline" size={20} color="#fff" />
                                                <Text style={styles.unityButtonText}>Open Unity scene</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                }
                                return renderDraft({ item });
                            }}
                            keyExtractor={item => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingLeft: (width - 80) / 2, paddingRight: 20 }}
                        />

                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    orbContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    noiseWebView: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    noiseContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    // Matches Composer Header Style
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    iconButton: {
        padding: 8,
    },
    heroContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroText: {
        fontSize: 32,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 40,
    },
    tabs: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    activeTab: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: 16,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.white,
        paddingBottom: 4,
    },
    inactiveTab: {
        color: theme.colors.textDim,
        fontSize: 16,
        paddingBottom: 4,
    },
    draftCard: {
        width: 140,
        height: 180,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        marginRight: 12,
        padding: 12,
        justifyContent: 'flex-end',
    },
    newCard: {
        width: 140,
        height: 180,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
    },
    newButton: {
        width: 120,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    addCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    draftPreview: {
        flex: 1,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 8,
        marginBottom: 8,
    },
    draftTitle: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    draftDate: {
        color: theme.colors.textDim,
        fontSize: 12,
    },
    cardText: {
        color: theme.colors.white,
        marginTop: 8,
        fontWeight: '600',
    },
    unityButton: {
        width: 140,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    unityButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});

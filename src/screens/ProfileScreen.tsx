import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ImageBackground, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';

import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { AuthService } from '../services/auth';
import { User } from '../types';
import { db } from '../config/firebase';
import { AnimatedBackground } from '../components/AnimatedBackground';

const { width } = Dimensions.get('window');

export const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const currentUser = useAppStore(state => state.currentUser);
    const notifications = useAppStore(state => state.notifications);
    const hasUnread = notifications.some(n => !n.read);
    const insets = useSafeAreaInsets();

    // Params: userId can be passed to view others. If null, view self.
    const targetUserId = route.params?.userId || currentUser?.id;
    const isSelf = targetUserId === currentUser?.id;

    const [profileUser, setProfileUser] = useState<User | null>(isSelf ? currentUser : null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (isSelf && currentUser) {
                // Recalculate stats from actual subcollections (self-healing)
                await AuthService.recalculateUserStats(currentUser.id);
                // Refetch updated user doc
                const snap = await getDoc(doc(db, 'users', currentUser.id));
                if (snap.exists()) {
                    setProfileUser(snap.data() as User);
                } else {
                    setProfileUser(currentUser);
                }
                return;
            }

            setLoading(true);
            try {
                // Fetch user doc
                const snap = await getDoc(doc(db, 'users', targetUserId));
                if (snap.exists()) {
                    setProfileUser(snap.data() as User);
                }

                // Check following status
                if (currentUser) {
                    const following = await AuthService.checkIsFollowing(currentUser.id, targetUserId);
                    setIsFollowing(following);
                }
            } catch (e) {
                console.error("Failed to load profile", e);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [targetUserId, currentUser, isSelf]);

    const handleFollowToggle = async () => {
        if (!currentUser || !profileUser) return;
        try {
            if (isFollowing) {
                await AuthService.unfollowUser(currentUser.id, profileUser.id);
                setIsFollowing(false);
                // Optimistic update
                setProfileUser(prev => prev ? ({ ...prev, followers: Math.max(0, prev.followers - 1) }) : null);
            } else {
                await AuthService.followUser(currentUser.id, profileUser.id);
                setIsFollowing(true);
                // Optimistic update
                setProfileUser(prev => prev ? ({ ...prev, followers: prev.followers + 1 }) : null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleMessagePress = async () => {
        if (!currentUser || !profileUser) return;

        const permission = profileUser.messagingPermission || 'Everyone';

        if (permission === 'Everyone') {
            navigation.navigate('Chat', { userId: profileUser.id });
            return;
        }

        if (permission === 'Off') {
            Alert.alert(
                "Message not sent",
                `${profileUser.name || profileUser.username} is not accepting new messages right now.`
            );
            return;
        }

        if (permission === 'Following') {
            // Check if profileUser follows currentUser
            // We verify if they are in my followers list, OR check DB if needed.
            // Using AuthService for authoritative check: checkIsFollowing(followerId, followingId)
            // checkIsFollowing(A, B) checks if A follows B.
            // We want to know if profileUser follows currentUser.
            const isFollower = await AuthService.checkIsFollowing(profileUser.id, currentUser.id);

            if (isFollower) {
                navigation.navigate('Chat', { userId: profileUser.id });
            } else {
                Alert.alert(
                    "Message not sent",
                    `${profileUser.name || profileUser.username} only accepts messages from people they follow. You need to connect with them first.`
                );
            }
        }
    };

    if (!profileUser) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <LinearGradient
                colors={[theme.colors.surfaceHighlight, theme.colors.background]}
                style={StyleSheet.absoluteFill}
            />
            <Text style={{ color: 'white' }}>Loading...</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* World Background - Hero Element */}
            <View style={styles.backgroundContainer}>
                {profileUser.worldBackground ? (
                    <ImageBackground
                        source={{ uri: profileUser.worldBackground }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent']}
                            locations={[0, 0.4, 1]}
                            style={{ flex: 1 }}
                        />
                    </ImageBackground>
                ) : (
                    <AnimatedBackground />
                )}
            </View>

            {/* Top Navigation - Floating & Minimal */}
            <SafeAreaView style={styles.topNav} edges={['top']}>
                {!isSelf && (
                    <TouchableOpacity style={styles.glassIconBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={24} color={theme.colors.white} />
                    </TouchableOpacity>
                )}
                {isSelf && <View style={{ flex: 1 }} />}
                {isSelf && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={styles.glassIconBtn} onPress={() => navigation.navigate('Settings')}>
                            <Ionicons name="settings-outline" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.glassIconBtn} onPress={() => navigation.navigate('Activity')}>
                            <Ionicons name="notifications-outline" size={24} color={theme.colors.white} />
                            {hasUnread && <View style={styles.redDot} />}
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            {/* Content - Bottom Sheet Style */}
            <View style={styles.contentContainer}>
                {/* Wrapper for relative positioning of avatar on panel edge */}
                <View style={{ position: 'relative' }}>
                    {/* Avatar - Positioned to straddle the top edge of panel */}
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: profileUser.avatar }} style={styles.avatar} />
                        {profileUser.isVerified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark" size={10} color={theme.colors.white} />
                            </View>
                        )}
                    </View>

                    <BlurView intensity={40} tint="dark" style={[styles.glassPanel, { paddingBottom: insets.bottom + 20 }]}>

                        {/* Identity */}
                        <View style={styles.identitySection}>
                            <Text style={styles.name}>{profileUser.name || profileUser.username}</Text>
                            <Text style={styles.username}>@{profileUser.username}</Text>
                            <Text style={styles.bioText} numberOfLines={2}>{profileUser.bio || "No bio yet."}</Text>
                        </View>

                        {/* Stats - Clean Row */}
                        <View style={styles.statsRow}>
                            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('People', { tab: 'Following', userId: profileUser.id })}>
                                <Text style={styles.statNumber}>{profileUser.following}</Text>
                                <Text style={styles.statLabel}>Following</Text>
                            </TouchableOpacity>
                            <View style={styles.statDivider} />
                            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('People', { tab: 'Followers', userId: profileUser.id })}>
                                <Text style={styles.statNumber}>{profileUser.followers}</Text>
                                <Text style={styles.statLabel}>Followers</Text>
                            </TouchableOpacity>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{profileUser.fuelBalance || 0}</Text>
                                <Text style={styles.statLabel}>Fuel</Text>
                            </View>
                        </View>

                        {/* Hero Actions - Consolidated */}
                        <View style={styles.actionContainer}>
                            {!isSelf && (
                                <View style={styles.buttonRow}>
                                    {/* Secondary: Message/Follow */}
                                    <TouchableOpacity style={styles.secondaryCircleBtn} onPress={isFollowing ? handleFollowToggle : handleFollowToggle}>
                                        <Ionicons name={isFollowing ? "person-remove-outline" : "person-add-outline"} size={24} color={theme.colors.white} />
                                    </TouchableOpacity>

                                    {/* Secondary: Message */}
                                    <TouchableOpacity style={styles.secondaryCircleBtn} onPress={handleMessagePress}>
                                        <Ionicons name="chatbubble-outline" size={22} color={theme.colors.white} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Consolidated Action Group (World | Gallery) */}
                            <View style={styles.buttonGroupContainer}>
                                <BlurView intensity={20} tint="light" style={styles.buttonGroupBlur}>
                                    {/* Left: World Action */}
                                    <TouchableOpacity
                                        style={[styles.groupButton, styles.groupButtonDivider]}
                                        onPress={() => {
                                            if (isSelf) {
                                                navigation.navigate('Figment', {
                                                    mode: 'world',
                                                    worldSceneId: profileUser.worldSceneId || null
                                                });
                                            } else {
                                                if (profileUser.worldSceneId) {
                                                    navigation.navigate('Figment', {
                                                        viewOnly: true,
                                                        worldSceneId: profileUser.worldSceneId,
                                                        mode: 'world'
                                                    });
                                                } else {
                                                    Alert.alert('No World', 'This user has not created a world yet.');
                                                }
                                            }
                                        }}
                                        disabled={!isSelf && !profileUser.worldSceneId}
                                    >
                                        <Ionicons
                                            name={isSelf ? (profileUser.worldSceneId ? "globe-outline" : "add-circle-outline") : "enter-outline"}
                                            size={20}
                                            color={(isSelf || profileUser.worldSceneId) ? "#fff" : "rgba(255,255,255,0.5)"}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={[styles.groupButtonText, (!isSelf && !profileUser.worldSceneId) && { color: 'rgba(255,255,255,0.5)' }]}>
                                            {isSelf ? (profileUser.worldSceneId ? 'Edit World' : 'Create World') : 'Enter World'}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Right: Gallery Action */}
                                    <TouchableOpacity
                                        style={styles.groupButton}
                                        onPress={() => {
                                            if (isSelf || !profileUser.isPrivate || (profileUser.isPrivate && isFollowing)) {
                                                navigation.navigate('ProfileGallery', { userId: profileUser.id, username: profileUser.username });
                                            }
                                        }}
                                        disabled={!isSelf && profileUser.isPrivate && !isFollowing}
                                    >
                                        <Ionicons
                                            name={(!isSelf && profileUser.isPrivate && !isFollowing) ? "lock-closed-outline" : "grid-outline"}
                                            size={20}
                                            color={(!isSelf && profileUser.isPrivate && !isFollowing) ? "rgba(255,255,255,0.5)" : "#fff"}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={[styles.groupButtonText, (!isSelf && profileUser.isPrivate && !isFollowing) && { color: 'rgba(255,255,255,0.5)' }]}>
                                            Gallery
                                        </Text>
                                    </TouchableOpacity>
                                </BlurView>
                            </View>
                        </View>



                    </BlurView>
                </View>
            </View>

            {/* Gallery (Scrollable content below header if needed, or handle differently) */}
            <ScrollView style={{ marginTop: 20, display: 'none' }} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Hidden for now to focus on spatial hero */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        zIndex: 10,
    },
    glassIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    redDot: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    glassPanel: {
        marginTop: 50, // Space for avatar to overlap
        borderRadius: 32,
        paddingTop: 60, // Increased space for avatar overlap
        paddingHorizontal: 20,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(20,20,30,0.4)',
    },
    avatarContainer: {
        position: 'absolute',
        top: 0, // Aligns top with wrapper, but glassPanel has marginTop: 50
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    identitySection: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    name: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 2,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    username: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 8,
    },
    bioText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    statNumber: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    actionContainer: {
        width: '100%',
        alignItems: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    secondaryCircleBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonGroupContainer: {
        width: '100%',
        marginTop: 24,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    buttonGroupBlur: {
        flexDirection: 'row',
        height: 56,
        alignItems: 'center',
        borderRadius: 28,
        overflow: 'hidden',
    },
    groupButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    groupButtonDivider: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
    },
    groupButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

import { useAppStore } from '../store';
import { User, Notification } from '../types';

export const PeopleScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const initialTab = route.params?.tab || 'Following';
    const currentUser = useAppStore(state => state.currentUser);

    const [activeTab, setActiveTab] = useState(initialTab);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Real data from Firestore
    const [followingUsers, setFollowingUsers] = useState<User[]>([]);
    const [followerUsers, setFollowerUsers] = useState<User[]>([]);
    const [teamUsers, setTeamUsers] = useState<User[]>([]);
    const [collabInvites, setCollabInvites] = useState<Notification[]>([]);

    // Store actions
    const unfollowUser = useAppStore(state => state.unfollowUser);
    const respondToCollabInvite = useAppStore(state => state.respondToCollabInvite);
    const notifications = useAppStore(state => state.notifications);

    // Fetch real data on mount
    useEffect(() => {
        if (!currentUser?.id) return;
        fetchAllData();
    }, [currentUser?.id]);

    // Update collab invites when notifications change
    useEffect(() => {
        const invites = notifications.filter(n => n.type === 'collab_invite' && n.actionStatus === 'pending');
        setCollabInvites(invites);
    }, [notifications]);

    const fetchAllData = async () => {
        if (!currentUser?.id) return;
        setLoading(true);

        try {
            // Fetch Following
            const followingRef = collection(db, 'users', currentUser.id, 'following');
            const followingSnap = await getDocs(followingRef);
            const followingIds = followingSnap.docs.map(d => d.id);
            const followingData = await fetchUsersByIds(followingIds);
            setFollowingUsers(followingData);

            // Fetch Followers
            const followersRef = collection(db, 'users', currentUser.id, 'followers');
            const followersSnap = await getDocs(followersRef);
            const followerIds = followersSnap.docs.map(d => d.id);
            const followerData = await fetchUsersByIds(followerIds);
            setFollowerUsers(followerData);

            // Fetch Team from multiple sources:
            // 1. Local relationships.team (from accepted invites)
            // 2. Owners of scenes where I'm a collaborator
            // 3. Other collaborators on scenes I own or collaborate on
            const teamIdsSet = new Set<string>(useAppStore.getState().relationships.team || []);

            // Query scenes where I'm a collaborator to get owners
            const collabScenesQuery = query(
                collection(db, 'scenes'),
                where('collaborators', 'array-contains', currentUser.id)
            );
            const collabScenes = await getDocs(collabScenesQuery);
            collabScenes.docs.forEach(doc => {
                const data = doc.data();
                if (data.ownerId && data.ownerId !== currentUser.id) {
                    teamIdsSet.add(data.ownerId);
                }
            });

            // Query scenes I own to get their collaborators
            const ownedScenesQuery = query(
                collection(db, 'scenes'),
                where('ownerId', '==', currentUser.id)
            );
            const ownedScenes = await getDocs(ownedScenesQuery);
            ownedScenes.docs.forEach(doc => {
                const data = doc.data();
                const collabs = data.collaborators || [];
                collabs.forEach((id: string) => {
                    if (id !== currentUser.id) teamIdsSet.add(id);
                });
            });

            const teamData = await fetchUsersByIds(Array.from(teamIdsSet));
            setTeamUsers(teamData);

        } catch (e) {
            console.error('[PeopleScreen] Error fetching data:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsersByIds = async (ids: string[]): Promise<User[]> => {
        const users: User[] = [];
        for (const id of ids) {
            try {
                const userDoc = await getDoc(doc(db, 'users', id));
                if (userDoc.exists()) {
                    users.push({ id, ...userDoc.data() } as User);
                }
            } catch (e) {
                console.warn(`Failed to fetch user ${id}`);
            }
        }
        return users;
    };

    // Get users for current tab
    const getTabUsers = () => {
        let list: User[] = [];

        switch (activeTab) {
            case 'Team':
                list = teamUsers;
                break;
            case 'Followers':
                list = followerUsers;
                break;
            case 'Following':
                list = followingUsers;
                break;
            case 'Invites':
                // For invites tab, we return the notification senders
                return collabInvites; // Return notifications, not users
            default:
                list = [];
        }

        // Search filter
        if (search) {
            return list.filter(u =>
                u.username?.toLowerCase().includes(search.toLowerCase()) ||
                u.name?.toLowerCase().includes(search.toLowerCase())
            );
        }
        return list;
    };

    const displayItems = getTabUsers();

    // Actions
    const handleAcceptInvite = async (invite: Notification) => {
        try {
            await respondToCollabInvite(
                invite.id,
                invite.data?.postId || '',
                invite.user.id,
                'a scene',
                true
            );
            Alert.alert("Success", "You've joined the collaboration!");
        } catch (e) {
            Alert.alert("Error", "Failed to accept invite");
        }
    };

    const handleDeclineInvite = async (invite: Notification) => {
        Alert.alert(
            "Decline Invitation",
            "Are you sure you want to decline this collaboration invite?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Decline",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await respondToCollabInvite(
                                invite.id,
                                invite.data?.postId || '',
                                invite.user.id,
                                'a scene',
                                false
                            );
                        } catch (e) {
                            Alert.alert("Error", "Failed to decline invite");
                        }
                    }
                }
            ]
        );
    };

    const handleUnfollowRequest = (userId: string) => {
        Alert.alert(
            "Unfollow",
            "Are you sure you want to unfollow this person?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Unfollow", style: 'destructive', onPress: () => unfollowUser(userId) }
            ]
        );
    };

    const renderUserItem = ({ item }: { item: User }) => {
        return (
            <TouchableOpacity
                style={styles.userRow}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
            >
                <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                <View style={styles.userInfo}>
                    <Text style={styles.username}>@{item.username}</Text>
                    {item.name && <Text style={styles.userStatus}>{item.name}</Text>}
                </View>

                {/* --- TEAM TAB --- */}
                {activeTab === 'Team' && (
                    <View style={[styles.actionButton, styles.teamBadge]}>
                        <Ionicons name="people" size={14} color={theme.colors.primary} />
                        <Text style={styles.teamText}>Collaborator</Text>
                    </View>
                )}

                {/* --- FOLLOWERS TAB --- */}
                {activeTab === 'Followers' && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('Chat', { userId: item.id })}
                    >
                        <Text style={styles.actionText}>Message</Text>
                    </TouchableOpacity>
                )}

                {/* --- FOLLOWING TAB --- */}
                {activeTab === 'Following' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.connectedButton]}
                        onPress={() => handleUnfollowRequest(item.id)}
                    >
                        <Text style={[styles.actionText, styles.connectedText]}>Following</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderInviteItem = ({ item }: { item: Notification }) => {
        return (
            <View style={styles.userRow}>
                <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                <View style={styles.userInfo}>
                    <Text style={styles.username}>@{item.user?.username}</Text>
                    <Text style={styles.userStatus}>{item.message}</Text>
                </View>

                <View style={styles.inviteContainer}>
                    <TouchableOpacity
                        style={[styles.inviteButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleAcceptInvite(item)}
                    >
                        <Text style={styles.actionText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.inviteButton, { backgroundColor: '#333' }]}
                        onPress={() => handleDeclineInvite(item)}
                    >
                        <Text style={[styles.actionText, { color: '#FFF' }]}>Decline</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    {navigation.canGoBack() && (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.title}>People</Text>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for a person"
                        placeholderTextColor={theme.colors.textDim}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <View style={styles.tabs}>
                {['Team', 'Followers', 'Invites', 'Following'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                            {tab === 'Invites' && collabInvites.length > 0 && (
                                <Text style={styles.badgeText}> ({collabInvites.length})</Text>
                            )}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : activeTab === 'Invites' ? (
                <FlatList
                    data={collabInvites}
                    renderItem={renderInviteItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="mail-outline"
                                size={48}
                                color={theme.colors.textDim}
                            />
                            <Text style={styles.emptyText}>
                                No pending invitations
                            </Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={displayItems as User[]}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="people-outline"
                                size={48}
                                color={theme.colors.textDim}
                            />
                            <Text style={styles.emptyText}>
                                {`No ${activeTab.toLowerCase()} yet`}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.m,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    backButton: {
        marginRight: theme.spacing.m,
        padding: 4,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: theme.spacing.m,
    },
    searchIcon: {
        marginRight: theme.spacing.s,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        color: theme.colors.text,
        fontSize: 16,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.m,
        gap: 8,
        marginBottom: theme.spacing.m,
    },
    tab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.l,
        backgroundColor: theme.colors.surface,
    },
    activeTab: {
        backgroundColor: theme.colors.white,
    },
    tabText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontSize: 13,
    },
    activeTabText: {
        color: theme.colors.background,
    },
    badgeText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    list: {
        padding: theme.spacing.m,
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: theme.colors.textDim,
        marginTop: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: theme.colors.textDim,
        marginTop: 12,
        fontSize: 16,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: theme.spacing.m,
        backgroundColor: '#333',
    },
    userInfo: {
        flex: 1,
    },
    username: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 16,
    },
    userStatus: {
        color: theme.colors.textDim,
        fontSize: 12,
    },
    actionButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 4,
        marginRight: theme.spacing.m,
    },
    connectedButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 12,
    },
    connectedText: {
        color: theme.colors.text,
    },
    teamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(206, 255, 29, 0.15)',
        borderWidth: 1,
        borderColor: theme.colors.primary,
        gap: 4,
    },
    teamText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 12,
    },
    inviteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        overflow: 'hidden',
    },
    inviteButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
});

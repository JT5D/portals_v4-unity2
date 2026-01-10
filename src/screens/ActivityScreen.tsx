import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Image,
    TouchableOpacity,
    ScrollView,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager,
    Alert,
    Dimensions,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { Notification } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthService } from '../services/auth';
import { NotificationService } from '../services/notifications';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterType = 'All' | 'Collabs' | 'Mentions';

// Swipeable notification item component
const NotificationItem = ({
    item,
    isSelectionMode,
    isSelected,
    onPress,
    onLongPress,
    onToggleSelect,
    onDelete,
    onFollowBack,
    hasFollowedBack,
    currentUserId,
    renderIconBadge,
}: {
    item: Notification;
    isSelectionMode: boolean;
    isSelected: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onToggleSelect: () => void;
    onDelete: () => void;
    onFollowBack?: () => void;
    hasFollowedBack?: boolean;
    currentUserId?: string;
    renderIconBadge: (type: string) => React.ReactNode;
}) => {
    const swipeableRef = useRef<Swipeable>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0.5],
            extrapolate: 'clamp',
        });

        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    swipeableRef.current?.close();
                    onDelete();
                }}
            >
                <Animated.View style={{ transform: [{ scale }] }}>
                    <Ionicons name="trash-outline" size={24} color="white" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const handlePress = () => {
        if (isSelectionMode) {
            Haptics.selectionAsync();
            onToggleSelect();
        } else {
            onPress();
        }
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            friction={2}
            rightThreshold={40}
            enabled={!isSelectionMode}
        >
            <TouchableOpacity
                style={[
                    styles.row,
                    !item.read && styles.unreadRow,
                    isSelected && styles.selectedRow,
                ]}
                onPress={handlePress}
                onLongPress={handleLongPress}
                activeOpacity={0.7}
                delayLongPress={300}
            >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                    <View style={styles.checkboxContainer}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="black" />}
                        </View>
                    </View>
                )}

                {/* Avatar with badge */}
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    {renderIconBadge(item.type)}
                    {!item.read && <View style={styles.unreadDot} />}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.textContainer}>
                        <Text style={styles.text} numberOfLines={2}>
                            <Text style={styles.username}>{item.user.name || item.user.username}</Text>{' '}
                            {item.message}
                        </Text>
                        <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>

                    {/* Follow Back Action */}
                    {item.type === 'follow' && !hasFollowedBack && !isSelectionMode && (
                        <TouchableOpacity
                            style={styles.followBackBtn}
                            onPress={onFollowBack}
                        >
                            <Text style={styles.followBackText}>Follow Back</Text>
                        </TouchableOpacity>
                    )}
                    {item.type === 'follow' && hasFollowedBack && (
                        <Text style={styles.statusText}>Following</Text>
                    )}

                    {/* Message Reply */}
                    {item.type === 'message' && !isSelectionMode && (
                        <TouchableOpacity style={styles.replyBtn} onPress={onPress}>
                            <Ionicons name="arrow-undo" size={14} color={theme.colors.textDim} />
                            <Text style={styles.replyText}>Reply</Text>
                        </TouchableOpacity>
                    )}

                    {/* Collab Status */}
                    {item.type === 'collab_invite' && item.actionStatus !== 'pending' && (
                        <Text style={styles.statusText}>
                            {item.actionStatus === 'accepted' ? 'Accepted' : 'Declined'}
                        </Text>
                    )}
                </View>

                {/* Media Preview */}
                {item.data?.previewMedia && !isSelectionMode && (
                    <Image source={{ uri: item.data.previewMedia }} style={styles.postPreview} />
                )}
            </TouchableOpacity>
        </Swipeable>
    );
};

export const ActivityScreen = () => {
    const navigation = useNavigation<any>();
    const currentUser = useAppStore(state => state.currentUser);
    const notifications = useAppStore(state => state.notifications);
    const setNotifications = useAppStore(state => state.setNotifications);
    const markAsRead = useAppStore(state => state.markAsRead);
    const markAllAsReadAndClear = useAppStore(state => state.markAllAsReadAndClear);

    // Selection mode state from store
    const isSelectionMode = useAppStore(state => state.isSelectionMode);
    const selectedNotificationIds = useAppStore(state => state.selectedNotificationIds);
    const enterSelectionMode = useAppStore(state => state.enterSelectionMode);
    const exitSelectionMode = useAppStore(state => state.exitSelectionMode);
    const toggleNotificationSelection = useAppStore(state => state.toggleNotificationSelection);
    const selectAllNotifications = useAppStore(state => state.selectAllNotifications);
    const deleteSelectedNotifications = useAppStore(state => state.deleteSelectedNotifications);
    const deleteNotification = useAppStore(state => state.deleteNotification);

    const relationships = useAppStore(state => state.relationships); // Get relationships for following check

    // Local state
    const [followedBackIds, setFollowedBackIds] = useState<Set<string>>(new Set());
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');

    // Subscribe to real-time Firestore notifications
    useEffect(() => {
        if (!currentUser?.id) return;

        console.log('[ActivityScreen] Subscribing to notifications for:', currentUser.id);
        const unsubscribe = NotificationService.subscribeToNotifications(
            currentUser.id,
            (fetchedNotifications) => {
                setNotifications(fetchedNotifications);
            }
        );

        return () => {
            console.log('[ActivityScreen] Unsubscribing from notifications');
            unsubscribe();
        };
    }, [currentUser?.id]);

    // Mark all as read when leaving the screen
    useFocusEffect(
        useCallback(() => {
            // On focus: nothing special
            return () => {
                // On blur (leaving screen): mark all as read
                console.log('[ActivityScreen] Screen blur - marking all as read');
                markAllAsReadAndClear();
                // Also exit selection mode if active
                if (isSelectionMode) {
                    exitSelectionMode();
                }
            };
        }, [markAllAsReadAndClear, isSelectionMode, exitSelectionMode])
    );

    // Filtered notifications
    const filteredNotifications = notifications.filter(n => {
        // 1. First apply Category Tab filters
        if (activeFilter === 'Collabs' && n.type !== 'collab_invite') return false;
        if (activeFilter === 'Mentions' && (n.type !== 'mention' && n.type !== 'like_comment')) return false;

        // 2. Apply User Preferences Logic
        if (!currentUser?.notificationPreferences) return true; // Default to showing if no prefs

        const prefs = currentUser.notificationPreferences;
        let prefValue: 'Everyone' | 'Following' | 'Off' = 'Everyone';

        switch (n.type) {
            case 'like_post':
            case 'like_comment':
                prefValue = prefs.likes;
                break;
            case 'comment':
                prefValue = prefs.comments;
                break;
            case 'mention':
                prefValue = prefs.mentions;
                break;
            case 'follow':
                prefValue = prefs.follows;
                break;
            // 'remixes' not yet implemented in backend types, but if added:
            // case 'remix': prefValue = prefs.remixes; break;
            default:
                // For types not in prefs (e.g. messages, collab invites), always show
                return true;
        }

        if (prefValue === 'Off') return false;
        if (prefValue === 'Following') {
            // Check if user is in following list
            return relationships.following.includes(n.user.id);
        }

        return true;
    });

    const handleFollowBack = async (userId: string) => {
        if (!currentUser) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFollowedBackIds(prev => new Set(prev).add(userId));
        try {
            await AuthService.followUser(currentUser.id, userId);
        } catch (error) {
            console.error('Follow back failed:', error);
            setFollowedBackIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const handleNotificationPress = (item: Notification) => {
        markAsRead(item.id);
        if (item.type === 'message') {
            navigation.navigate('Chat', { userId: item.user.id });
        } else if (item.data?.postId) {
            // navigation.navigate('PostDetail', { postId: item.data.postId });
        }
    };

    const handleLongPress = (item: Notification) => {
        if (!isSelectionMode) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            enterSelectionMode();
            toggleNotificationSelection(item.id);
        }
    };

    const handleDeleteItem = (id: string) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        deleteNotification(id);
                    },
                },
            ]
        );
    };

    const handleDeleteSelected = () => {
        const count = selectedNotificationIds.size;
        Alert.alert(
            'Delete Notifications',
            `Delete ${count} notification${count > 1 ? 's' : ''}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        deleteSelectedNotifications();
                    },
                },
            ]
        );
    };

    const renderIconBadge = (type: string) => {
        let icon = 'notifications';
        let color = theme.colors.primary;
        let iconColor = 'white';

        switch (type) {
            case 'like_post': icon = 'heart'; color = '#E91E63'; break;
            case 'collab_invite': icon = 'people'; color = '#9C27B0'; break;
            case 'collab_update': icon = 'sync'; color = '#673AB7'; break;
            case 'mention': icon = 'at'; color = '#2196F3'; break;
            case 'message': icon = 'chatbubble'; color = '#4CAF50'; break;
            case 'comment': icon = 'chatbubble-ellipses'; color = '#FF9800'; break;
            case 'follow':
                icon = 'person-add';
                color = theme.colors.primary;
                iconColor = 'black';
                break;
        }

        return (
            <View style={[styles.iconBadge, { backgroundColor: color }]}>
                <Ionicons name={icon as any} size={10} color={iconColor} />
            </View>
        );
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <NotificationItem
            item={item}
            isSelectionMode={isSelectionMode}
            isSelected={selectedNotificationIds.has(item.id)}
            onPress={() => handleNotificationPress(item)}
            onLongPress={() => handleLongPress(item)}
            onToggleSelect={() => toggleNotificationSelection(item.id)}
            onDelete={() => handleDeleteItem(item.id)}
            onFollowBack={() => handleFollowBack(item.user.id)}
            hasFollowedBack={followedBackIds.has(item.user.id)}
            currentUserId={currentUser?.id}
            renderIconBadge={renderIconBadge}
        />
    );

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    {isSelectionMode ? (
                        // Selection Mode Header
                        <View style={styles.selectionHeader}>
                            <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.selectionCount}>
                                {selectedNotificationIds.size} Selected
                            </Text>
                            <TouchableOpacity
                                onPress={handleDeleteSelected}
                                style={styles.headerBtn}
                                disabled={selectedNotificationIds.size === 0}
                            >
                                <Text style={[
                                    styles.deleteText,
                                    selectedNotificationIds.size === 0 && styles.deleteTextDisabled
                                ]}>
                                    Delete
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Normal Header
                        <View style={styles.headerRow}>
                            {navigation.canGoBack() && (
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
                                </TouchableOpacity>
                            )}
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Activity</Text>
                                {unreadCount > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={enterSelectionMode}
                                style={styles.editButton}
                                disabled={notifications.length === 0}
                            >
                                <Text style={[
                                    styles.editText,
                                    notifications.length === 0 && styles.editTextDisabled
                                ]}>
                                    Edit
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Filter Tabs */}
                {!isSelectionMode && (
                    <View style={styles.tabsContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
                            {(['All', 'Collabs', 'Mentions'] as FilterType[]).map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[styles.tab, activeFilter === filter && styles.activeTab]}
                                    onPress={() => setActiveFilter(filter)}
                                >
                                    <Text style={[styles.tabText, activeFilter === filter && styles.activeTabText]}>
                                        {filter}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Selection Actions Bar */}
                {isSelectionMode && (
                    <View style={styles.selectionActionsBar}>
                        <TouchableOpacity
                            style={styles.selectAllBtn}
                            onPress={() => {
                                if (selectedNotificationIds.size === notifications.length) {
                                    exitSelectionMode();
                                } else {
                                    selectAllNotifications();
                                }
                            }}
                        >
                            <Ionicons
                                name={selectedNotificationIds.size === notifications.length ? "checkbox" : "checkbox-outline"}
                                size={20}
                                color={theme.colors.primary}
                            />
                            <Text style={styles.selectAllText}>Select All</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Notification List */}
                <FlatList
                    data={filteredNotifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color={theme.colors.textDim} />
                            <Text style={styles.emptyTitle}>No Notifications</Text>
                            <Text style={styles.emptyText}>When you get notifications, they'll show up here</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.s,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    backButton: {
        padding: 4,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 4,
    },
    title: {
        ...theme.typography.h2,
        color: theme.colors.text,
        fontSize: 28,
    },
    unreadBadge: {
        backgroundColor: '#FE2C55',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        paddingHorizontal: 6,
    },
    unreadBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    editButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    editText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    editTextDisabled: {
        color: theme.colors.textDim,
    },
    cancelText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    selectionCount: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    deleteText: {
        color: '#FE2C55',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteTextDisabled: {
        color: theme.colors.textDim,
    },
    tabsContainer: {
        marginBottom: theme.spacing.s,
    },
    tabsContent: {
        paddingHorizontal: theme.spacing.m,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    activeTab: {
        backgroundColor: theme.colors.white,
        borderColor: theme.colors.white,
    },
    tabText: {
        color: theme.colors.textDim,
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: theme.colors.background,
    },
    selectionActionsBar: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border,
    },
    selectAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectAllText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        paddingVertical: theme.spacing.s,
        flexGrow: 1,
    },
    separator: {
        height: 0.5,
        backgroundColor: theme.colors.border,
        marginLeft: 76,
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: theme.spacing.m,
        alignItems: 'flex-start',
        backgroundColor: theme.colors.background,
    },
    unreadRow: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    selectedRow: {
        backgroundColor: 'rgba(254, 214, 10, 0.1)',
    },
    checkboxContainer: {
        justifyContent: 'center',
        marginRight: 12,
        paddingTop: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: theme.colors.textDim,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    avatarContainer: {
        marginRight: 12,
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.surface,
    },
    iconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FE2C55',
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    textContainer: {
        marginBottom: 4,
    },
    text: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    username: {
        color: theme.colors.text,
        fontWeight: '700',
    },
    timestamp: {
        color: theme.colors.textDim,
        fontSize: 12,
        marginTop: 2,
    },
    postPreview: {
        width: 48,
        height: 64,
        borderRadius: 4,
        backgroundColor: theme.colors.surfaceHighlight,
    },
    followBackBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    followBackText: {
        color: 'black',
        fontWeight: '600',
        fontSize: 12,
    },
    statusText: {
        marginTop: 6,
        color: theme.colors.textDim,
        fontSize: 12,
        fontStyle: 'italic',
    },
    replyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    replyText: {
        color: theme.colors.textDim,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    deleteAction: {
        backgroundColor: '#FE2C55',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    emptyContainer: {
        flex: 1,
        paddingTop: 100,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
    },
    emptyText: {
        color: theme.colors.textDim,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
});

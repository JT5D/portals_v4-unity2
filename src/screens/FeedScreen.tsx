import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, StatusBar, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { FeedItem } from '../components/FeedItem';
import { CommentsSheet } from '../components/CommentsSheet';
import { LinearGradient } from 'expo-linear-gradient'; // Assuming available, or remove if error

const { width, height } = Dimensions.get('window');
const ALL_CATEGORIES = ["Live", "Feed", "Friends", "Artifacts", "Exclusive", "Creative", "Countdown", "Music", "Sports", "Entertainment"];

// --- Category Feed Component ---
const CategoryFeed = ({ category, isActive, onCommentPress, hideControls }: { category: string, isActive: boolean, onCommentPress: (id: string) => void, hideControls?: boolean }) => {
    // Determine data based on category (Mock logic)
    const allFeed = useAppStore(state => state.feed);
    const relationships = useAppStore(state => state.relationships);
    const setVoiceContext = useAppStore(state => state.setVoiceContext);
    const [refreshing, setRefreshing] = useState(false);

    // Filter feed based on category
    const categoryData = allFeed.filter(post => {
        // Special case: Friends shows posts from followed users
        if (category === 'Friends') {
            return relationships.following.includes(post.userId);
        }
        // Special case: Artifacts shows all posts marked as artifacts
        if (category === 'Artifacts') {
            return post.isArtifact === true;
        }
        // Default category matching
        const postCategory = post.category || 'Feed';
        return postCategory === category;
    });

    const handleRefresh = async () => {
        setRefreshing(true);
        await new Promise(r => setTimeout(r, 1500));
        // In real app, refetch category.
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: any }) => (
        <FeedItem post={item} onCommentPress={() => onCommentPress(item.id)} hideControls={hideControls} />
    );

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (isActive && viewableItems && viewableItems.length > 0) {
            const currentItem = viewableItems[0];
            if (currentItem) {
                setVoiceContext({
                    currentScreen: 'Feed',
                    currentType: 'post',
                    currentId: currentItem.key || currentItem.item.id
                });
            }
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    return (
        <View style={{ width, height: height - 80 }}>
            {/* height - 80 accounts for bottom tab bar roughly, usually flex:1 is better but nested in horizontal list needs explicit dims */}
            <FlatList
                data={categoryData}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={height - 80} // Consistent with previous implementation
                snapToAlignment="start"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                refreshing={refreshing}
                onRefresh={handleRefresh}
            />
        </View>
    );
};

// --- Main Feed Screen ---
export const FeedScreen = () => {
    const navigation = useNavigation<any>();
    const [activeIndex, setActiveIndex] = useState(1); // Default to second visible tab (Feed)
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const fetchFeed = useAppStore(state => state.fetchFeed);
    const pendingComment = useAppStore(state => state.pendingComment);
    const allFeed = useAppStore(state => state.feed);
    const relationships = useAppStore(state => state.relationships);

    const feedListRef = useRef<FlatList>(null);
    const tabsListRef = useRef<FlatList>(null);

    // Animation for video shrink when comments open
    const videoScale = useRef(new Animated.Value(1)).current;

    // Calculate visible categories dynamically based on content availability
    const visibleCategories = useMemo(() => {
        // Always show Live and Feed
        const visible: string[] = ["Live", "Feed"];

        ALL_CATEGORIES.forEach(category => {
            if (category === 'Live' || category === 'Feed') return;

            // Check if any posts exist for this category
            const hasContent = allFeed.some(post => {
                if (category === 'Friends') return relationships.following.includes(post.userId);
                if (category === 'Artifacts') return post.isArtifact === true;
                return (post.category || 'Feed') === category;
            });
            if (hasContent) visible.push(category);
        });

        return visible;
    }, [allFeed, relationships.following]);


    // Fetch posts from Firestore on mount
    useEffect(() => {
        fetchFeed();
    }, []);

    // Auto-open comments sheet when voice sets a pending comment
    useEffect(() => {
        if (pendingComment?.postId) {
            setSelectedPostId(pendingComment.postId);
        }
    }, [pendingComment]);

    // Animate video scale when comments open/close
    useEffect(() => {
        Animated.timing(videoScale, {
            toValue: selectedPostId ? 0.45 : 1, // Shrink to 45% when comments open
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [selectedPostId]);

    const handleTabPress = (index: number) => {
        setActiveIndex(index);
        feedListRef.current?.scrollToIndex({ index, animated: true });
        tabsListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    };

    const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        if (index !== activeIndex) {
            setActiveIndex(index);
            tabsListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }
    };

    useEffect(() => {
        // Force initial scroll alignment
        // We use a slightly longer delay to ensure layout is computed
        setTimeout(() => {
            if (tabsListRef.current) {
                tabsListRef.current.scrollToIndex({
                    index: activeIndex,
                    animated: true, // Animated ensure it scrolls after layout 
                    viewPosition: 0.5
                });
            }
        }, 500);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />

            {/* Top Categories Tab Bar - hidden when comments open */}
            {!selectedPostId && (
                <View style={styles.topTabsContainer}>
                    <FlatList
                        ref={tabsListRef}
                        data={visibleCategories}
                        horizontal
                        scrollEnabled={visibleCategories.length > 1}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={item => item}
                        contentContainerStyle={styles.tabsContent}
                        ListHeaderComponent={<View style={{ width: width / 2 - 40 }} />}
                        ListFooterComponent={<View style={{ width: width / 2 - 40 }} />}
                        renderItem={({ item, index }) => {
                            const isActive = index === activeIndex;
                            // Dynamic opacity based on distance from center
                            const distance = Math.abs(index - activeIndex);
                            const opacity = Math.max(0.35, 1 - (distance * 0.3));

                            return (
                                <TouchableOpacity onPress={() => handleTabPress(index)} style={[styles.tabItem, { opacity }]}>
                                    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                                        {item}
                                    </Text>
                                    {isActive && <View style={styles.activeIndicator} />}
                                </TouchableOpacity>
                            );
                        }}
                        // Remove fixed initialScrollIndex to avoid conflicts with centering logic
                        onLayout={() => {
                            tabsListRef.current?.scrollToIndex({
                                index: activeIndex,
                                animated: false,
                                viewPosition: 0.5
                            });
                        }}
                        initialNumToRender={visibleCategories.length}
                        onScrollToIndexFailed={info => {
                            const wait = new Promise(resolve => setTimeout(resolve, 500));
                            wait.then(() => {
                                tabsListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                            });
                        }}
                    />
                </View>
            )}

            {/* Search Button */}
            <TouchableOpacity
                style={styles.searchButton}
                onPress={() => navigation.navigate('Search')}
            >
                <Ionicons name="search" size={28} color="white" />
            </TouchableOpacity>

            {/* Animated Video Container - shrinks when comments open */}
            <Animated.View style={[
                styles.videoContainer,
                {
                    transform: [
                        { scale: videoScale },
                        // Keep video at top when shrinking
                        {
                            translateY: videoScale.interpolate({
                                inputRange: [0.45, 1],
                                outputRange: [-(height - 80) * 0.66, 0]
                            })
                        }
                    ]
                }
            ]}>
                {/* Horizontal Feed Pager */}
                <FlatList
                    ref={feedListRef}
                    data={visibleCategories}
                    horizontal
                    pagingEnabled
                    scrollEnabled={visibleCategories.length > 1}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item}
                    onMomentumScrollEnd={onMomentumScrollEnd}
                    initialScrollIndex={1}
                    getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
                    renderItem={({ item, index }) => (
                        <CategoryFeed
                            category={item}
                            isActive={index === activeIndex}
                            onCommentPress={setSelectedPostId}
                            hideControls={!!selectedPostId}
                        />
                    )}
                />
            </Animated.View>

            <CommentsSheet
                visible={!!selectedPostId}
                postId={selectedPostId}
                onClose={() => setSelectedPostId(null)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    videoContainer: {
        flex: 1,
    },
    topTabsContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        height: 50,
        zIndex: 10,
        // Centering logic handled by FlatList contentContainer and initial scroll
    },
    tabsContent: {
        alignItems: 'center',
    },
    tabItem: {
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        paddingBottom: 8, // Shift text up slightly to make room for indicator
    },
    tabText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        fontSize: 16,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    activeTabText: {
        color: theme.colors.white,
        fontWeight: '700',
        fontSize: 17,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 2, // Move closer to bottom edge
        width: 20,
        height: 3,
        backgroundColor: 'white',
        borderRadius: 2,
    },
    gradient: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 60,
        zIndex: 20,
    },
    gradientLeft: {
        left: 0,
    },
    gradientRight: {
        right: 0,
    },
    searchButton: {
        position: 'absolute',
        top: 55,
        right: 20,
        zIndex: 30,
    }
});

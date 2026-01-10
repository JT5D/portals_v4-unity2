import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, Image, TouchableOpacity, ScrollView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { Post } from '../types';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2; // 16 padding on sides + 16 gap

export const ShopScreen = () => {
    const navigation = useNavigation<any>();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    // Get collected artifacts from store
    const collectedArtifacts = useAppStore(state => state.collectedArtifacts);
    const fetchCollectedArtifacts = useAppStore(state => state.fetchCollectedArtifacts);

    // Fetch collected artifacts on mount
    useEffect(() => {
        fetchCollectedArtifacts();
    }, []);

    // Filter by search term
    const filteredArtifacts = collectedArtifacts.filter(post => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            post.caption?.toLowerCase().includes(searchLower) ||
            post.user?.username?.toLowerCase().includes(searchLower)
        );
    });

    const categories = ['All', 'Collected', 'Redeemable', 'Digital', 'Unlocks'];

    const handleArtifactPress = (artifact: Post) => {
        navigation.navigate('ArtifactViewer', { post: artifact });
    };

    const renderGridItem = ({ item }: { item: Post }) => (
        <TouchableOpacity style={styles.gridItem} onPress={() => handleArtifactPress(item)}>
            <Image source={{ uri: item.coverImage || item.mediaUri }} style={styles.gridImage} />
            <View style={styles.gridOverlay}>
                <View style={styles.collectedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                </View>
            </View>
            <View style={styles.gridInfo}>
                <Text style={styles.gridTitle} numberOfLines={1}>{item.caption || 'Untitled'}</Text>
                <View style={styles.artifactBadge}>
                    <Ionicons name="diamond" size={10} color={theme.colors.secondary} />
                    <Text style={styles.artifactBadgeText}>Artifact</Text>
                </View>
            </View>
            {/* Mini User Avatar */}
            <View style={styles.gridUser}>
                <Image source={{ uri: item.user?.avatar || 'https://via.placeholder.com/16' }} style={styles.gridAvatar} />
                <Text style={styles.gridUsername} numberOfLines={1}>@{item.user?.username || 'creator'}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="diamond-outline" size={64} color={theme.colors.textDim} />
            <Text style={styles.emptyTitle}>No Artifacts Yet</Text>
            <Text style={styles.emptySubtitle}>
                Find and collect artifacts from the map!{'\n'}
                They'll appear here in your collection.
            </Text>
            <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Map')}
            >
                <Ionicons name="map" size={20} color="black" />
                <Text style={styles.exploreButtonText}>Explore Map</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Artifacts</Text>
                <View style={styles.headerActions}>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{collectedArtifacts.length}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search your artifacts..."
                    placeholderTextColor={theme.colors.textDim}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {collectedArtifacts.length === 0 ? (
                renderEmptyState()
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Categories */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.categoryChip, activeCategory === cat && styles.activeCategory]}
                                onPress={() => setActiveCategory(cat)}
                            >
                                <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Collection Grid */}
                    <Text style={styles.sectionTitle}>Your Collection</Text>
                    <View style={styles.gridContainer}>
                        {filteredArtifacts.map(post => (
                            <View key={post.id} style={{ marginBottom: 16 }}>
                                {renderGridItem({ item: post })}
                            </View>
                        ))}
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    countBadge: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    countText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 16,
    },
    categoriesList: {
        marginBottom: 24,
    },
    categoryChip: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    activeCategory: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    activeCategoryText: {
        color: '#000',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginLeft: 16,
        marginBottom: 12,
    },
    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textDim,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
    },
    exploreButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
    },
    // Grid
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    gridItem: {
        width: COLUMN_WIDTH,
        marginBottom: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        paddingBottom: 8,
    },
    gridImage: {
        width: '100%',
        height: COLUMN_WIDTH,
        backgroundColor: '#333',
    },
    gridOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    collectedBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 4,
        borderRadius: 4,
    },
    gridInfo: {
        padding: 8,
    },
    gridTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    artifactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    artifactBadgeText: {
        color: theme.colors.secondary,
        fontSize: 11,
        fontWeight: '600',
    },
    gridUser: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingBottom: 4,
    },
    gridAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 4,
    },
    gridUsername: {
        color: theme.colors.textDim,
        fontSize: 10,
    },
});


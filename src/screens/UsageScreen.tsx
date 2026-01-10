import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import * as Clipboard from 'expo-clipboard';
import { PurchaseModal, PurchaseMode } from '../components/PurchaseModal';

type ViewMode = 'overview' | 'scenes' | 'locations';

export const UsageScreen = () => {
    const navigation = useNavigation<any>();
    const currentUser = useAppStore(state => state.currentUser);
    const [isInviteModalVisible, setInviteModalVisible] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('overview');

    // Purchase Modal State
    const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);

    // Derived usage stats
    const scenesUsed = currentUser?.usage?.scenes.used || 0;
    const scenesLimit = currentUser?.usage?.scenes.limit || 50;
    const scenesResetDate = currentUser?.usage?.scenes.resetDate || 'Jan 10';

    const locationsUsed = currentUser?.usage?.locations.used || 0;
    const locationsLimit = currentUser?.usage?.locations.limit || 100;
    const locationsResetDate = currentUser?.usage?.locations.resetDate || 'Jan 10';

    const scenesRemaining = Math.max(0, scenesLimit - scenesUsed);
    const locationsRemaining = Math.max(0, locationsLimit - locationsUsed);

    // Filter purchase options based on open view
    const getPurchaseMode = (): PurchaseMode => {
        if (viewMode === 'scenes') return 'scenes';
        if (viewMode === 'locations') return 'locations';
        return 'all';
    };

    // Handle Hardware Back Button
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (viewMode !== 'overview') {
                    setViewMode('overview');
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [viewMode])
    );

    const handleBack = () => {
        if (viewMode !== 'overview') {
            setViewMode('overview');
        } else {
            navigation.goBack();
        }
    };

    const formatDate = (dateString: string) => {
        try {
            if (dateString.length < 10) return dateString;
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    const handleCopyLink = async () => {
        await Clipboard.setStringAsync(`https://h3m.ai/invite/${currentUser?.id || 'user'}`);
        setInviteModalVisible(false);
    };

    const handleShareLink = async () => {
        setInviteModalVisible(false);
    };

    // --- Sub-Components for Views ---

    const renderOverview = () => (
        <>
            {/* Main Countdown Header */}
            <View style={styles.countdownContainer}>
                <View style={styles.countdownRow}>
                    <Text style={styles.countdownNumber}>{scenesRemaining}</Text>
                    <Text style={styles.countdownLabel}>scenes left</Text>
                </View>
            </View>

            {/* Usage Lists */}
            <View style={styles.usageGroup}>
                <TouchableOpacity style={styles.usageItem} onPress={() => setViewMode('scenes')}>
                    <View style={styles.usageItemContent}>
                        <Text style={styles.usageItemTitle}>
                            {scenesRemaining} free
                        </Text>
                        <Text style={styles.usageItemSubtitle}>
                            More available on {formatDate(scenesResetDate)}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
                </TouchableOpacity>

                <View style={styles.separator} />

                {/* Paid Scenes (Mock) - also links to Scenes detail */}
                <TouchableOpacity style={styles.usageItem} onPress={() => setViewMode('scenes')}>
                    <View style={styles.usageItemContent}>
                        <Text style={styles.usageItemTitle}>
                            {currentUser?.usage?.paidScenes || 0} paid
                        </Text>
                        <Text style={styles.usageItemSubtitle}>
                            Used when free scenes run out
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
                </TouchableOpacity>
            </View>

            <Text style={styles.disclaimer}>Usage varies by project complexity. Learn more</Text>

            {/* Locations Usage Group */}
            <View style={[styles.usageGroup, { marginTop: 24 }]}>
                <TouchableOpacity style={styles.usageItem} onPress={() => setViewMode('locations')}>
                    <View style={styles.usageItemContent}>
                        <Text style={styles.usageItemTitle}>
                            {locationsRemaining} locations
                        </Text>
                        <Text style={styles.usageItemSubtitle}>
                            More available on {formatDate(locationsResetDate)}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
                </TouchableOpacity>
            </View>
        </>
    );

    const renderDetailView = (type: 'scenes' | 'locations') => {
        const title = type === 'scenes' ? 'Scenes' : 'Locations';
        const remaining = type === 'scenes' ? scenesRemaining : locationsRemaining;
        const limit = type === 'scenes' ? scenesLimit : locationsLimit;
        const used = type === 'scenes' ? scenesUsed : locationsUsed;
        const resetDate = type === 'scenes' ? scenesResetDate : locationsResetDate;
        const paid = type === 'scenes' ? (currentUser?.usage?.paidScenes || 0) : 0; // Assuming locations don't track 'paid' separately in this mock yet, or 0.

        return (
            <View style={{ flex: 1 }}>
                <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>{title}</Text>
                    <Text style={styles.detailCount}>{remaining} Available</Text>
                </View>

                <View style={styles.usageGroup}>
                    <View style={styles.usageItem}>
                        <View style={styles.usageItemContent}>
                            <Text style={styles.usageItemTitle}>Monthly Allowance</Text>
                            <Text style={styles.usageItemSubtitle}>{limit - Math.max(0, limit - used)} / {limit} Used</Text>
                        </View>
                        <Text style={styles.detailValueText}>Resets {formatDate(resetDate)}</Text>
                    </View>

                    {type === 'scenes' && (
                        <>
                            <View style={styles.separator} />
                            <View style={styles.usageItem}>
                                <View style={styles.usageItemContent}>
                                    <Text style={styles.usageItemTitle}>Paid Packs</Text>
                                    <Text style={styles.usageItemSubtitle}>Purchased separately</Text>
                                </View>
                                <Text style={styles.detailValueText}>{paid} Remaining</Text>
                            </View>
                        </>
                    )}
                </View>

                <Text style={styles.detailInfoText}>
                    {type === 'scenes'
                        ? "Scenes allow you to publish AR experiences to the world. Free scenes check usage monthly."
                        : "Locations allow you to place persistent anchors in the real world. Free locations reset monthly."}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                {viewMode !== 'overview' && (
                    <Text style={styles.headerTitle}>{viewMode === 'scenes' ? 'Scenes' : 'Locations'}</Text>
                )}
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {viewMode === 'overview' && renderOverview()}
                {viewMode === 'scenes' && renderDetailView('scenes')}
                {viewMode === 'locations' && renderDetailView('locations')}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {viewMode === 'overview' && (
                    <TouchableOpacity
                        style={styles.inviteButton}
                        onPress={() => setInviteModalVisible(true)}
                    >
                        <Text style={styles.inviteButtonText}>Invite a friend • 10 scenes</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={() => setPurchaseModalVisible(true)}
                >
                    <Text style={styles.addMoreButtonText}>Add more</Text>
                </TouchableOpacity>
            </View>

            {/* Invite Modal */}
            <Modal
                visible={isInviteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setInviteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setInviteModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.modalIconContainer}>
                            <Ionicons name="people" size={40} color="#000" />
                        </View>

                        <Text style={styles.modalTitle}>Invite a friend</Text>
                        <Text style={styles.modalBody}>
                            Get 10 free scenes/locations when a friend you've invited joins Portals. Terms apply.
                        </Text>

                        <TouchableOpacity style={styles.modalButtonSecondary} onPress={handleCopyLink}>
                            <Text style={styles.modalButtonTextSecondary}>Copy invite link</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleShareLink}>
                            <Text style={styles.modalButtonTextPrimary}>Share invite link</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Purchase Modal */}
            <PurchaseModal
                visible={purchaseModalVisible}
                onClose={() => setPurchaseModalVisible(false)}
                mode={getPurchaseMode()}
            />

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 20,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 150, // Extra space for footer
    },
    countdownContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    countdownRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    countdownNumber: {
        fontSize: 64,
        fontWeight: '600',
        color: '#fff',
        letterSpacing: -1,
    },
    countdownLabel: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '500',
        marginLeft: 12,
    },
    usageGroup: {
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 16,
        overflow: 'hidden',
    },
    usageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    usageItemContent: {
        flex: 1,
    },
    usageItemTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    usageItemSubtitle: {
        color: theme.colors.textDim,
        fontSize: 14,
    },
    separator: {
        height: 1,
        backgroundColor: '#333',
        marginLeft: 16,
    },
    disclaimer: {
        marginTop: 12,
        color: theme.colors.textDim,
        fontSize: 13,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#000', // Ensure visibility over content
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
    },
    inviteButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    inviteButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    addMoreButton: {
        backgroundColor: '#fff',
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
    },
    addMoreButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 16,
    },

    // Detailed View Styles
    detailHeader: {
        marginBottom: 24,
        marginTop: 10,
    },
    detailTitle: {
        color: theme.colors.textDim,
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    detailCount: {
        color: '#fff',
        fontSize: 42,
        fontWeight: '700',
    },
    detailValueText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    detailInfoText: {
        marginTop: 20,
        color: theme.colors.textDim,
        fontSize: 14,
        lineHeight: 20,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        alignItems: 'center',
        paddingBottom: 40,
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        padding: 8,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
    modalBody: {
        color: theme.colors.textDim,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    modalButtonPrimary: {
        backgroundColor: '#fff',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    modalButtonTextPrimary: {
        color: '#000',
        fontWeight: '600',
        fontSize: 16,
    },
    modalButtonSecondary: {
        backgroundColor: 'transparent',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 12,
    },
    modalButtonTextSecondary: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});

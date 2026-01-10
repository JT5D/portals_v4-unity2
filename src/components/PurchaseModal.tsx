import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

export type PurchaseMode = 'all' | 'scenes' | 'locations';

interface PurchaseModalProps {
    visible: boolean;
    onClose: () => void;
    mode: PurchaseMode;
}

export const PurchaseModal = ({ visible, onClose, mode }: PurchaseModalProps) => {

    const renderOption = (
        title: string,
        description: string,
        price: string,
        icon: any,
        highlight: boolean = false
    ) => (
        <TouchableOpacity style={[styles.optionCard, highlight && styles.optionCardHighlight]}>
            <View style={styles.optionIconContainer}>
                <Ionicons name={icon} size={24} color={highlight ? '#000' : '#fff'} />
            </View>
            <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, highlight && styles.textHighlight]}>{title}</Text>
                <Text style={[styles.optionDesc, highlight && styles.textHighlight]}>{description}</Text>
            </View>
            <View style={styles.priceContainer}>
                <Text style={[styles.priceText, highlight && styles.textHighlight]}>{price}</Text>
            </View>
        </TouchableOpacity>
    );

    const showScenes = mode === 'all' || mode === 'scenes';
    const showLocations = mode === 'all' || mode === 'locations';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>Add more</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Pro Upgrade - Always Visible */}
                        {renderOption(
                            "Pro Account",
                            "Unlimited scenes & locations + value tools",
                            "$9.99/mo",
                            "star",
                            true
                        )}

                        <View style={styles.divider} />

                        {/* Usage Packs */}
                        {(showScenes || showLocations) && (
                            <Text style={styles.sectionLabel}>One-time packs</Text>
                        )}

                        {showScenes && renderOption(
                            "50 Scenes",
                            "Add 50 publishable scenes",
                            "$4.99",
                            "images-outline"
                        )}

                        {showScenes && renderOption(
                            "100 Scenes",
                            "Add 100 publishable scenes",
                            "$8.99",
                            "images-outline"
                        )}

                        {showLocations && renderOption(
                            "10 Locations",
                            "Place 10 persistent location pins",
                            "$4.99",
                            "location-outline"
                        )}

                        {showLocations && renderOption(
                            "25 Locations",
                            "Place 25 persistent location pins",
                            "$9.99",
                            "location-outline"
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        position: 'relative',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        padding: 4,
    },
    scrollContent: {
        padding: 20,
    },
    sectionLabel: {
        color: theme.colors.textDim,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    optionCardHighlight: {
        backgroundColor: '#fff',
    },
    optionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    optionDesc: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        lineHeight: 16,
    },
    priceContainer: {
        paddingLeft: 12,
    },
    priceText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    textHighlight: {
        color: '#000',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 16,
    },
});

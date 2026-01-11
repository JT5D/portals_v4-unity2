import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import * as Clipboard from 'expo-clipboard';

export const InviteFriendsScreen = () => {
    const navigation = useNavigation();
    const INVITE_LINK = "https://portals.app/invite/user123"; // Logic to generate real link would go here

    const handleCopy = async () => {
        await Clipboard.setStringAsync(INVITE_LINK);
        Alert.alert('Copied', 'Invite link copied to clipboard.');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out Portals! ${INVITE_LINK}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite friends</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>

                {/* Actions Group */}
                <View style={styles.groupContainer}>
                    <TouchableOpacity style={styles.itemRow} onPress={handleCopy}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="copy-outline" size={24} color="#fff" />
                            <Text style={styles.itemLabel}>Copy link</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.itemRow} onPress={handleShare}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="share-outline" size={24} color="#fff" />
                            <Text style={styles.itemLabel}>Share link</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={styles.helperText}>
                    Get 10 free video gens when a friend you've invited joins. Terms apply
                </Text>

                {/* Sync Contacts */}
                <View style={styles.groupContainer}>
                    <TouchableOpacity style={styles.itemRow} onPress={() => Alert.alert('Sync', 'Contact syncing coming soon')}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="person-circle-outline" size={24} color="#fff" />
                            <Text style={styles.itemLabel}>Sync contacts</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.helperText}>
                    Sync your contacts to find your friends or invite friends.
                </Text>

            </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    content: {
        padding: 16,
    },
    groupContainer: {
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemLabel: {
        fontSize: 16,
        color: '#fff',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginLeft: 52, // Indent past icon
    },
    helperText: {
        color: theme.colors.textDim,
        fontSize: 13,
        paddingHorizontal: 16,
        marginBottom: 24,
        lineHeight: 18,
    }
});

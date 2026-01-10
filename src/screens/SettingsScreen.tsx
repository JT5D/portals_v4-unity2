import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';

const SettingsItem = ({
    label,
    icon,
    onPress,
    showChevron = true,
    textColor = theme.colors.text,
    iconColor = theme.colors.text
}: {
    label: string,
    icon?: any,
    onPress: () => void,
    showChevron?: boolean,
    textColor?: string,
    iconColor?: string
}) => (
    <TouchableOpacity style={styles.itemRow} onPress={onPress}>
        <View style={styles.itemLeft}>
            {icon && <Ionicons name={icon} size={22} color={iconColor} style={styles.itemIcon} />}
            <Text style={[styles.itemLabel, { color: textColor }]}>{label}</Text>
        </View>
        {showChevron && <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />}
    </TouchableOpacity>
);

const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
);

export const SettingsScreen = () => {
    const navigation = useNavigation<any>();
    const logout = useAppStore(state => state.logout);

    const handleLogout = () => {
        Alert.alert('Log out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: () => logout() }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>Settings</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Invite Friends - Special Section */}
                <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => navigation.navigate('InviteFriends')}
                >
                    <View style={styles.inviteLeft}>
                        <Ionicons name="person-add-outline" size={22} color={theme.colors.text} />
                        <Text style={styles.inviteText}>Invite friends</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
                </TouchableOpacity>

                {/* Main Settings Group */}
                <View style={styles.groupContainer}>
                    <SettingsItem
                        label="Account"
                        icon="person-circle-outline"
                        onPress={() => navigation.navigate('AccountSettings')}
                    />
                    <SettingsItem
                        label="Notifications"
                        icon="notifications-outline"
                        onPress={() => navigation.navigate('NotificationSettings')}
                    />
                    {/* 
                      Excluded: Character access, Data controls, Parental controls
                      Included: Usage (from prompt)
                     */}
                    <SettingsItem
                        label="Usage"
                        icon="time-outline"
                        onPress={() => navigation.navigate('Usage')}
                    />
                </View>

                <SectionHeader title="Privacy" />
                <View style={styles.groupContainer}>
                    <SettingsItem
                        label="Direct messages"
                        icon="paper-plane-outline"
                        onPress={() => navigation.navigate('MessagePermission')}
                    />
                </View>

                <SectionHeader title="About" />
                <View style={styles.groupContainer}>
                    <SettingsItem
                        label="Help Center"
                        icon="help-circle-outline"
                        onPress={() => Alert.alert('Coming Soon', 'Help Center is under construction.')}
                    />
                    <SettingsItem
                        label="Terms of service"
                        icon="document-text-outline"
                        onPress={() => navigation.navigate('TermsOfService')}
                    />
                    <SettingsItem
                        label="Privacy policy"
                        icon="shield-checkmark-outline"
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    />
                </View>

                {/* Logout - Separate Group */}
                <View style={[styles.groupContainer, { marginTop: 24 }]}>
                    <SettingsItem
                        label="Log out"
                        icon="log-out-outline"
                        iconColor={theme.colors.text}
                        // textColor={theme.colors.error}
                        showChevron={false}
                        onPress={handleLogout}
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Pitch black background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surfaceHighlight,
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    inviteLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inviteText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    groupContainer: {
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
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
    itemIcon: {
        width: 24,
    },
    itemLabel: {
        fontSize: 16,
        color: '#fff',
    },
    sectionHeader: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textDim,
        marginBottom: 8,
        paddingHorizontal: 4,
    }
});

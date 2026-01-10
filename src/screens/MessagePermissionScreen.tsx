import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

type PermissionOption = 'Everyone' | 'Following' | 'No one';

export const MessagePermissionScreen = () => {
    const navigation = useNavigation<any>();
    const currentUser = useAppStore(state => state.currentUser);
    const updateProfile = useAppStore(state => state.updateProfile);

    // Map 'Off' to 'No one' for display, but keep 'Off' in types/db if needed or align them.
    // The type in User interface is 'Everyone' | 'Following' | 'Off'. 
    // UI Says "No one". Let's map 'Off' <-> 'No one'.

    const getInitialValue = (): PermissionOption => {
        const val = currentUser?.messagingPermission || 'Everyone';
        if (val === 'Off') return 'No one';
        return val as PermissionOption;
    };

    const [selectedOption, setSelectedOption] = useState<PermissionOption>(getInitialValue());

    const handleSelect = async (option: PermissionOption) => {
        setSelectedOption(option);

        let dbValue: 'Everyone' | 'Following' | 'Off' = 'Everyone';
        if (option === 'No one') dbValue = 'Off';
        else dbValue = option as 'Everyone' | 'Following';

        // Update Store
        updateProfile({ messagingPermission: dbValue });

        // Persist
        if (currentUser) {
            try {
                await updateDoc(doc(db, 'users', currentUser.id), {
                    messagingPermission: dbValue
                });
            } catch (error) {
                console.error('Failed to save messaging permission:', error);
            }
        }
    };

    const OptionRow = ({ label, value }: { label: string, value: PermissionOption }) => (
        <TouchableOpacity
            style={styles.optionRow}
            onPress={() => handleSelect(value)}
            activeOpacity={0.7}
        >
            <Text style={styles.optionLabel}>{label}</Text>
            {selectedOption === value && (
                <Ionicons name="checkmark" size={24} color="#fff" />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messaging permission</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Who can message me</Text>

                <View style={styles.optionsContainer}>
                    <OptionRow label="Everyone" value="Everyone" />
                    <View style={styles.separator} />
                    <OptionRow label="People you follow" value="Following" />
                    <View style={styles.separator} />
                    <OptionRow label="No one" value="No one" />
                </View>

                <Text style={styles.footerText}>
                    People you follow or have chatted with before can always send you messages unless you block them.
                </Text>
            </ScrollView>
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 14,
        color: theme.colors.textDim,
        marginBottom: 12,
        marginLeft: 4,
    },
    optionsContainer: {
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 16,
        overflow: 'hidden',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        height: 56,
    },
    optionLabel: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    separator: {
        height: 1,
        backgroundColor: '#333',
        marginLeft: 16,
    },
    footerText: {
        marginTop: 16,
        color: theme.colors.textDim,
        fontSize: 13,
        lineHeight: 18,
        marginLeft: 4,
    }
});

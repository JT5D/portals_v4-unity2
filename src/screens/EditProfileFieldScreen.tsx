import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const EditProfileFieldScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { fieldLabel, initialValue, fieldKey } = route.params;

    const [value, setValue] = useState(initialValue);
    const [saving, setSaving] = useState(false);
    const currentUser = useAppStore(state => state.currentUser);
    const updateProfile = useAppStore(state => state.updateProfile); // Assuming this exists or we update store directly

    const handleSave = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            // Update Firestore
            const userRef = doc(db, 'users', currentUser.id);
            await updateDoc(userRef, {
                [fieldKey]: value.trim()
            });

            // Update Store
            const updatedUser = { ...currentUser, [fieldKey]: value.trim() };
            useAppStore.setState({ currentUser: updatedUser });

            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', 'Failed to update: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{fieldLabel}</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving || value === initialValue}
                    style={styles.saveButton}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={[
                            styles.saveText,
                            value === initialValue && { color: theme.colors.textDim }
                        ]}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={setValue}
                        autoFocus
                        placeholder={`Enter ${fieldLabel}`}
                        placeholderTextColor={theme.colors.textDim}
                        autoCapitalize="none"
                    />
                    {value.length > 0 && (
                        <TouchableOpacity onPress={() => setValue('')} style={styles.clearBtn}>
                            <Ionicons name="close-circle" size={20} color={theme.colors.textDim} />
                        </TouchableOpacity>
                    )}
                </View>
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
    saveButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 16,
    },
    saveText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    inputContainer: {
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    clearBtn: {
        marginLeft: 8,
    }
});

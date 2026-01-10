import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { db } from '../config/firebase';

const AccountItem = ({ label, value, onPress }: { label: string, value: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.itemRow} onPress={onPress}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.rightSide}>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
        </View>
    </TouchableOpacity>
);

export const AccountSettingsScreen = () => {
    const navigation = useNavigation<any>();
    const currentUser = useAppStore(state => state.currentUser);

    const navigateToEdit = (field: string, value: string, key: string) => {
        navigation.navigate('EditProfileField', { fieldLabel: field, initialValue: value, fieldKey: key });
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            // In a real app, upload to storage here
            const newUri = result.assets[0].uri;
            // Mock update
            useAppStore.setState(state => ({
                currentUser: { ...state.currentUser!, avatar: newUri }
            }));

            // Upload to firestore (mock)
            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.id);
                updateDoc(userRef, { avatar: newUri });
            }
        }
    };

    if (!currentUser) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Avatar Section */}
                <View style={[styles.groupContainer, { alignItems: 'center', paddingVertical: 20 }]}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                        {currentUser.avatar ? (
                            <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="person" size={40} color="#666" />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="camera" size={12} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                </View>

                <View style={styles.groupContainer}>
                    <AccountItem
                        label="Username"
                        value={currentUser.username}
                        onPress={() => navigateToEdit('Username', currentUser.username, 'username')}
                    />
                    <View style={styles.divider} />
                    <AccountItem
                        label="Display name"
                        value={currentUser.name || 'Not set'}
                        onPress={() => navigateToEdit('Display name', currentUser.name || '', 'name')}
                    />
                    <View style={styles.divider} />
                    <AccountItem
                        label="Bio"
                        value={currentUser.bio || 'Not set'}
                        onPress={() => navigateToEdit('Bio', currentUser.bio || '', 'bio')}
                    />
                </View>

                <View style={styles.groupContainer}>
                    <AccountItem
                        label="Email"
                        value={currentUser.email || '—'}
                        onPress={() => navigateToEdit('Email', currentUser.email || '', 'email')}
                    />
                    <View style={styles.divider} />
                    <AccountItem
                        label="Phone number"
                        value={currentUser.phoneNumber || '—'}
                        onPress={() => navigateToEdit('Phone number', currentUser.phoneNumber || '', 'phoneNumber')}
                    />
                </View>

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
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#333',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.surfaceHighlight,
    },
    changePhotoText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    label: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    rightSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
        paddingLeft: 16,
    },
    value: {
        fontSize: 16,
        color: theme.colors.textDim,
        maxWidth: 200,
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginLeft: 16,
    }
});

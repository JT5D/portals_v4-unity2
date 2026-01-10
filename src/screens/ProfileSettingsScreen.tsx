import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { resetOnboarding } from './OnboardingScreen';

export const ProfileSettingsScreen = () => {
    const navigation = useNavigation<any>();
    const currentUser = useAppStore(state => state.currentUser);
    const updateProfile = useAppStore(state => state.updateProfile);
    const logout = useAppStore(state => state.logout);

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
            setUsername(currentUser.username);
            setBio(currentUser.bio || '');
            setIsPrivate(currentUser.isPrivate || false);
        }
    }, [currentUser]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setNewAvatarUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !username.trim()) {
            Alert.alert('Error', 'Name and Username are required.');
            return;
        }

        if (!currentUser) return;
        setSaving(true);

        try {
            // Update Firestore
            const { doc, setDoc } = await import('firebase/firestore');
            const { db, storage } = await import('../config/firebase');

            let finalAvatarUrl = currentUser.avatar;

            // Upload new avatar if selected
            if (newAvatarUri) {
                const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

                // Use XHR to get Blob (More reliable in RN)
                const blob: Blob = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onload = function () { resolve(xhr.response); };
                    xhr.onerror = function () { reject(new Error('Image load failed')); };
                    xhr.responseType = 'blob';
                    xhr.open('GET', newAvatarUri, true);
                    xhr.send(null);
                });

                const fileRef = ref(storage, `avatars/${currentUser.id}_${Date.now()}`); // Unique name to force refresh
                await uploadBytes(fileRef, blob);
                finalAvatarUrl = await getDownloadURL(fileRef);
            }

            // Update Auth Profile as well for consistency
            const { getAuth, updateProfile } = await import('firebase/auth');
            const auth = getAuth();

            if (!auth.currentUser) throw new Error("No authenticated user");

            const userRef = doc(db, 'users', auth.currentUser.uid); // Ensure we write to the Auth user's doc
            await setDoc(userRef, {
                name: name.trim(),
                username: username.trim(),
                bio: bio.trim(),
                isPrivate: isPrivate,
                avatar: finalAvatarUrl
            }, { merge: true });

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: finalAvatarUrl, displayName: name.trim() });
            }

            console.log('[ProfileSettings] Avatar updated:', finalAvatarUrl);

            // Update Global Store
            const updatedUser = { ...currentUser, name, username, bio, isPrivate, avatar: finalAvatarUrl };
            useAppStore.setState({ currentUser: updatedUser });

            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error: any) {
            Alert.alert('Error', 'Failed to update profile: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Log out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: () => logout() }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.avatarSection}>
                    <TouchableOpacity style={styles.avatarPlaceholder} onPress={pickImage}>
                        {newAvatarUri ? (
                            <Image source={{ uri: newAvatarUri }} style={styles.avatarImage} />
                        ) : (
                            currentUser?.avatar ? (
                                <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
                            ) : (
                                <Ionicons name="camera" size={24} color={theme.colors.textDim} />
                            )
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage}>
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Name"
                        placeholderTextColor={theme.colors.textDim}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Username"
                        placeholderTextColor={theme.colors.textDim}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Bio</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Add a bio to your profile"
                        placeholderTextColor={theme.colors.textDim}
                        multiline
                    />
                </View>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.row} onPress={() => setIsPrivate(!isPrivate)}>
                    <Text style={styles.rowLabel}>Private Profile</Text>
                    <Ionicons name={isPrivate ? "toggle" : "toggle-outline"} size={28} color={isPrivate ? theme.colors.primary : theme.colors.textDim} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.row} onPress={async () => {
                    await resetOnboarding();
                    Alert.alert('Onboarding Reset', 'Restart the app to see onboarding again.');
                }}>
                    <Text style={styles.rowLabel}>Reset Onboarding</Text>
                    <Ionicons name="refresh-outline" size={22} color={theme.colors.textDim} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={handleLogout}>
                    <Text style={[styles.rowLabel, { color: theme.colors.error }]}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
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
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceHighlight,
    },
    headerTitle: {
        ...theme.typography.h2,
        color: theme.colors.text,
        fontSize: 16,
    },
    cancelText: {
        color: theme.colors.text,
        fontSize: 16,
    },
    saveText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 16,
    },
    content: {
        padding: theme.spacing.m,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden', // Add overflow hidden for image
    },
    avatarImage: {
        width: 80,
        height: 80,
    },
    changePhotoText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        color: theme.colors.textDim,
        fontSize: 12,
        marginBottom: 8,
    },
    input: {
        color: theme.colors.text,
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceHighlight,
        paddingVertical: 8,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    divider: {
        height: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceHighlight,
    },
    rowLabel: {
        color: theme.colors.text,
        fontSize: 16,
    }
});

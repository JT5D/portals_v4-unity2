import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useAppStore } from '../store';
import { NotificationPreferences, NotifyOption } from '../types';



const NotificationSection = ({
    title,
    description,
    value,
    onChange
}: {
    title: string,
    description: string,
    value: NotifyOption,
    onChange: (val: NotifyOption) => void
}) => {
    return (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionDesc}>{description}</Text>
            </View>
            <View style={styles.optionsContainer}>
                {(['Everyone', 'Following', 'Off'] as NotifyOption[]).map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[styles.optionBtn, value === option && styles.activeOptionBtn]}
                        onPress={() => onChange(option)}
                    >
                        <Ionicons
                            name={option === 'Everyone' ? 'people' : option === 'Following' ? 'person' : 'notifications-off'}
                            size={20}
                            color={value === option ? '#fff' : theme.colors.textDim}
                        />
                        <Text style={[styles.optionLabel, value === option && styles.activeOptionLabel]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export const NotificationSettingsScreen = () => {
    const navigation = useNavigation<any>();
    const currentUser = useAppStore(state => state.currentUser);
    const updateProfile = useAppStore(state => state.updateProfile);

    // Initialize state from currentUser preferences or default to Everyone
    const prefs = currentUser?.notificationPreferences || {
        likes: 'Everyone',
        comments: 'Everyone',
        mentions: 'Everyone',
        remixes: 'Everyone',
        follows: 'Everyone'
    };

    const [likes, setLikes] = useState<NotifyOption>(prefs.likes);
    const [comments, setComments] = useState<NotifyOption>(prefs.comments);
    const [mentions, setMentions] = useState<NotifyOption>(prefs.mentions);
    const [remixes, setRemixes] = useState<NotifyOption>(prefs.remixes);
    const [follows, setFollows] = useState<NotifyOption>(prefs.follows);

    const updatePreference = async (key: keyof NotificationPreferences, value: NotifyOption) => {
        if (!currentUser) return;

        // Update local state helpers
        switch (key) {
            case 'likes': setLikes(value); break;
            case 'comments': setComments(value); break;
            case 'mentions': setMentions(value); break;
            case 'remixes': setRemixes(value); break;
            case 'follows': setFollows(value); break;
        }

        // Update Store
        const newPrefs = {
            ...prefs,
            ...currentUser.notificationPreferences,
            [key]: value
        };

        updateProfile({ notificationPreferences: newPrefs });

        // Persist to Firestore
        try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            await updateDoc(doc(db, 'users', currentUser.id), {
                notificationPreferences: newPrefs
            });
        } catch (error) {
            console.error('Failed to save notification preference:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <NotificationSection
                    title="Likes"
                    description="Someone likes your content"
                    value={likes}
                    onChange={(val) => updatePreference('likes', val)}
                />

                <NotificationSection
                    title="Comments"
                    description="Someone comments on your content"
                    value={comments}
                    onChange={(val) => updatePreference('comments', val)}
                />

                <NotificationSection
                    title="Mentions"
                    description="Someone mentions you"
                    value={mentions}
                    onChange={(val) => updatePreference('mentions', val)}
                />

                <NotificationSection
                    title="Remixes"
                    description="Someone remixes you"
                    value={remixes}
                    onChange={(val) => updatePreference('remixes', val)}
                />

                <NotificationSection
                    title="Follows"
                    description="Someone follows you"
                    value={follows}
                    onChange={(val) => updatePreference('follows', val)}
                />

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
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeader: {
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionDesc: {
        color: theme.colors.textDim,
        fontSize: 13,
    },
    optionsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 16,
        padding: 4,
        justifyContent: 'space-between',
    },
    optionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    activeOptionBtn: {
        backgroundColor: '#333', // Slightly lighter highlight for active tab
    },
    optionLabel: {
        color: theme.colors.textDim,
        fontSize: 12,
        fontWeight: '500',
    },
    activeOptionLabel: {
        color: '#fff',
        fontWeight: '600',
    }
});

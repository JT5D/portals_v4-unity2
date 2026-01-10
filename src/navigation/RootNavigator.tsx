import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { OnboardingScreen, checkOnboardingComplete } from '../screens/OnboardingScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { PeopleScreen } from '../screens/PeopleScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileGalleryScreen } from '../screens/ProfileGalleryScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { AssetLibraryScreen } from '../screens/AssetLibraryScreen';
import { PostFeedScreen } from '../screens/PostFeedScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { TagPeopleScreen } from '../screens/TagPeopleScreen';
import { LocationPickerScreen } from '../screens/LocationPickerScreen';
import { useAppStore } from '../store';
import { View, Text, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';
import { theme } from '../theme/theme';
import { VoiceOverlay } from '../components/VoiceOverlay';

import { PostDetailsScreen } from '../screens/PostDetailsScreen';
import { ComposerEntryScreen } from '../screens/ComposerEntryScreen';
import { ComposerEditorScreen } from '../screens/Composer/ComposerEditorScreen';
import { ComposerPublishScreen } from '../screens/Composer/ComposerPublishScreen';
import { ARViewerScreen } from '../screens/AR/ARViewerScreen';
import FigmentScreenWrapper from '../screens/FigmentAR/FigmentScreenWrapper';
import { ARNavigationScreen } from '../screens/ARNavigationScreen';
import { ArtifactViewerScreen } from '../screens/ArtifactViewerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { InviteFriendsScreen } from '../screens/InviteFriendsScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { EditProfileFieldScreen } from '../screens/EditProfileFieldScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { UsageScreen } from '../screens/UsageScreen';
import { MessagePermissionScreen } from '../screens/MessagePermissionScreen';

// Stub or Reuse Screen
const UserProfileScreen = ProfileScreen; // Reuse for now, ideally refactor later

// Type definition for main stack navigation
export type RootParamList = {
    Tabs: undefined;
    Search: undefined;
    People: undefined;
    UserProfile: { userId?: string };
    ProfileGallery: undefined;
    Settings: undefined;
    InviteFriends: undefined;
    AccountSettings: undefined;
    EditProfileField: { field: string };
    NotificationSettings: undefined;
    MessagePermission: undefined;
    AssetLibrary: undefined;
    Usage: undefined;
    TermsOfService: undefined;
    PrivacyPolicy: undefined;
    ProfileSettings: undefined;
    Activity: undefined;
    PostFeed: { initialIndex?: number };
    PostDetails: { postId: string };
    ComposerEntry: undefined;
    ComposerEditor: undefined;
    ComposerPublish: undefined;
    Figment: undefined;
    ARViewer: undefined;
    Chat: { userId: string };
    TagPeople: undefined;
    LocationPicker: undefined;
    ARNavigation: undefined;
    ArtifactViewer: undefined;
};

const Stack = createNativeStackNavigator();

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

// Main Stack to support global pushes (above tabs)
import { TermsOfServiceScreen } from '../screens/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';

const MainStack = createNativeStackNavigator<RootParamList>();

const MainStackScreen = () => (
    <MainStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <MainStack.Screen name="Tabs" component={BottomTabNavigator} />
        <MainStack.Screen name="Search" component={SearchScreen} />
        <MainStack.Screen name="People" component={PeopleScreen} />
        <MainStack.Screen name="UserProfile" component={ProfileScreen} />
        <MainStack.Screen name="ProfileGallery" component={ProfileGalleryScreen} />
        <MainStack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
        <MainStack.Screen name="InviteFriends" component={InviteFriendsScreen} />
        <MainStack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <MainStack.Screen name="EditProfileField" component={EditProfileFieldScreen} />
        <MainStack.Screen name="AssetLibrary" component={AssetLibraryScreen} />
        <MainStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <MainStack.Screen name="MessagePermission" component={MessagePermissionScreen} />
        <MainStack.Screen name="Usage" component={UsageScreen} />
        <MainStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
        <MainStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        {/* Deprecated but kept for safety if deep links exist */}
        <MainStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
        <MainStack.Screen name="Activity" component={ActivityScreen} />
        <MainStack.Screen name="PostFeed" component={PostFeedScreen} />
        <MainStack.Screen name="PostDetails" component={PostDetailsScreen} />
        <MainStack.Screen name="ComposerEntry" component={ComposerEntryScreen} />
        <MainStack.Screen name="ComposerEditor" component={ComposerEditorScreen} />
        <MainStack.Screen name="ComposerPublish" component={ComposerPublishScreen} />
        <MainStack.Screen name="Figment" component={FigmentScreenWrapper} />
        <MainStack.Screen name="ARViewer" component={ARViewerScreen} options={{ presentation: 'transparentModal' }} />
        <MainStack.Screen name="Chat" component={ChatScreen} />
        <MainStack.Screen name="TagPeople" component={TagPeopleScreen} options={{ presentation: 'modal' }} />
        <MainStack.Screen name="LocationPicker" component={LocationPickerScreen} options={{ presentation: 'fullScreenModal' }} />
        <MainStack.Screen name="ARNavigation" component={ARNavigationScreen} options={{ headerShown: false, orientation: 'portrait' }} />
        <MainStack.Screen name="ArtifactViewer" component={ArtifactViewerScreen} options={{ headerShown: false }} />
    </MainStack.Navigator>
);

export const RootNavigator = () => {
    const isAuthenticated = useAppStore((state) => state.isAuthenticated);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const isVoiceActive = useAppStore(state => state.isVoiceActive);
    const navigationRef = useNavigationContainerRef();

    useEffect(() => {
        // Check onboarding status
        const checkOnboarding = async () => {
            const isComplete = await checkOnboardingComplete();
            setShowOnboarding(!isComplete);
        };
        checkOnboarding();

        // Auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const user = snap.data() as User;

                        // Self-healing: If avatar is missing in Firestore/User object, but exists in Auth, use Auth
                        if (!user.avatar && firebaseUser.photoURL) {
                            console.log('[RootNavigator] Avatar missing in Firestore, using Auth photoURL:', firebaseUser.photoURL);
                            user.avatar = firebaseUser.photoURL;
                            // Optionally update Firestore to fix it permanently (fire and forget)
                            updateDoc(docRef, { avatar: firebaseUser.photoURL }).catch(e => console.warn('Failed to heal avatar:', e));
                        }

                        console.log('[RootNavigator] Hydrated user:', user.id, 'Avatar:', user.avatar);
                        useAppStore.setState({ currentUser: user, isAuthenticated: true });

                        // Fetch following list for immediate follow status in feed
                        useAppStore.getState().fetchFollowing();

                        // Subscribe to notifications immediately after auth
                        const { NotificationService } = require('../services/notifications');
                        const notifUnsubscribe = NotificationService.subscribeToNotifications(
                            firebaseUser.uid,
                            (notifications: any) => {
                                useAppStore.getState().setNotifications(notifications);
                            }
                        );
                        // Store unsubscribe fn for cleanup (optional)
                        (window as any).__notifUnsubscribe = notifUnsubscribe;
                    }
                } catch (e) {
                    console.error("Auto-login failed", e);
                }
            } else {
                useAppStore.setState({ currentUser: null, isAuthenticated: false });
                // Cleanup notification subscription on logout
                if ((window as any).__notifUnsubscribe) {
                    (window as any).__notifUnsubscribe();
                }
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    // Handle onboarding completion
    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Show onboarding for new users (before auth or after)
    if (showOnboarding) {
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    return (
        <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {!isAuthenticated ? (
                        <Stack.Screen name="Auth" component={AuthStack} />
                    ) : (
                        <Stack.Screen name="Main" component={MainStackScreen} />
                    )}
                </Stack.Navigator>
            </NavigationContainer>

            {/* Voice Overlay on top of everything */}
            <VoiceOverlay visible={isVoiceActive} navigationRef={navigationRef} />
        </View>
    );
};


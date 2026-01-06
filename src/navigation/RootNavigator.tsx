import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { VoiceOverlay } from '../components/VoiceOverlay';
import { auth, db } from '../config/firebase';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { LocationPickerScreen } from '../screens/LocationPickerScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen, checkOnboardingComplete } from '../screens/OnboardingScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { PostFeedScreen } from '../screens/PostFeedScreen';
import { ProfileGalleryScreen } from '../screens/ProfileGalleryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { TagPeopleScreen } from '../screens/TagPeopleScreen';
import { useAppStore } from '../store';
import { theme } from '../theme/theme';
import { User } from '../types';
import { BottomTabNavigator } from './BottomTabNavigator';

import { ARViewerScreen } from '../screens/AR/ARViewerScreen';
import { ARNavigationScreen } from '../screens/ARNavigationScreen';
import { ArtifactViewerScreen } from '../screens/ArtifactViewerScreen';
import { ComposerEditorScreen } from '../screens/Composer/ComposerEditorScreen';
import { ComposerPublishScreen } from '../screens/Composer/ComposerPublishScreen';
import { ComposerEntryScreen } from '../screens/ComposerEntryScreen';
import FigmentScreenWrapper from '../screens/FigmentAR/FigmentScreenWrapper';
import { PostDetailsScreen } from '../screens/PostDetailsScreen';
import { UnityTestScene } from '../screens/UnityTestScene';

// Stub or Reuse Screen
const UserProfileScreen = ProfileScreen; // Reuse for now, ideally refactor later

const Stack = createNativeStackNavigator();

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

// Main Stack to support global pushes (above tabs)
const MainStack = createNativeStackNavigator();

const MainStackScreen = () => (
    <MainStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <MainStack.Screen name="Tabs" component={BottomTabNavigator} />
        <MainStack.Screen name="Search" component={SearchScreen} />
        <MainStack.Screen name="People" component={PeopleScreen} />
        <MainStack.Screen name="UserProfile" component={ProfileScreen} />
        <MainStack.Screen name="ProfileGallery" component={ProfileGalleryScreen} />
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
        {/* Unity test route */}
        <MainStack.Screen name="UnityTestScene" component={UnityTestScene} options={{ headerShown: false }} />
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

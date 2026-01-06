import 'dotenv/config';

export default {
    expo: {
        name: "Portals",
        slug: "Portals",
        scheme: "portals",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        newArchEnabled: true,
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.h3m.portals",
            deploymentTarget: "17.0",
            infoPlist: {
                NSPhotoLibraryUsageDescription: "The app accesses your photos to let you import media into the AR scene.",
                NSCameraUsageDescription: "The app uses your camera for AR.",
                NSMicrophoneUsageDescription: "The app uses your microphone for recording AR videos."
            }
        },
        android: {
            package: "com.h3m.portals",
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            },
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        plugins: [
            "expo-web-browser",
            "expo-audio",
            "expo-video",
            [
                "expo-location",
                {
                    locationAlwaysAndWhenInUsePermission: "Allow Portals to use your location."
                }
            ],
            [
                "@reactvision/react-viro",
                {
                    "googleCloudApiKey": process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY,
                    "cloudAnchorProvider": "arcore",
                    "geospatialAnchorProvider": "arcore",
                    "android": {
                        "xRMode": ["AR"]
                    }
                }
            ]
        ],
        extra: {
            firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
            firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
            firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
            firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
            firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
            firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
        }
    }
};

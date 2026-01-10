import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { theme } from '../../theme/theme';

interface VideoViewerProps {
    uri: string;
    style?: any;
    shouldPlay?: boolean;
}

export const VideoViewer = ({ uri, style, shouldPlay = true }: VideoViewerProps) => {
    const video = useRef<Video>(null);
    const [loading, setLoading] = useState(true);

    return (
        <View style={[styles.container, style]}>
            <Video
                ref={video}
                style={styles.video}
                source={{ uri }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={shouldPlay}
                onLoadStart={() => setLoading(true)}
                onLoad={() => setLoading(false)}
            />
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

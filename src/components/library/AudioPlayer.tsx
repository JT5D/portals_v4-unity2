import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface AudioPlayerProps {
    uri: string;
    style?: any;
}

export const AudioPlayer = ({ uri, style }: AudioPlayerProps) => {
    const [sound, setSound] = useState<Audio.Sound>();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);

    const soundRef = React.useRef<Audio.Sound | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadSound() {
            try {
                // Unload previous sound if exists
                if (soundRef.current) {
                    await soundRef.current.unloadAsync();
                }

                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                });

                const { sound: newSound, status } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: false },
                    (status) => {
                        if (status.isLoaded) {
                            setDuration(status.durationMillis || 0);
                            setPosition(status.positionMillis);
                            setIsPlaying(status.isPlaying);
                            setIsLoading(false);

                            if (status.didJustFinish) {
                                setIsPlaying(false);
                                newSound.setPositionAsync(0);
                            }
                        }
                    }
                );

                if (mounted) {
                    soundRef.current = newSound;
                    setSound(newSound);
                } else {
                    // If unmounted during load, unload immediately
                    newSound.unloadAsync();
                }
            } catch (error) {
                console.error('Error loading sound', error);
                if (mounted) setIsLoading(false);
            }
        }

        loadSound();

        return () => {
            mounted = false;
            // Use ref to clean up current sound instance
            if (soundRef.current) {
                soundRef.current.stopAsync(); // Stop logic before unload
                soundRef.current.unloadAsync();
            }
        };
    }, [uri]);

    const togglePlayback = async () => {
        if (!sound) return;
        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            await sound.playAsync();
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.iconContainer}>
                <Ionicons name="musical-note" size={48} color={theme.colors.primary} />
            </View>

            <View style={styles.controls}>
                {isLoading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                ) : (
                    <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={32}
                            color="#000"
                        />
                    </TouchableOpacity>
                )}

                <View style={styles.progressInfo}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(position / (duration || 1)) * 100}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    controls: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    timeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
});

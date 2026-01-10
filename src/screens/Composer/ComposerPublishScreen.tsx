import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ScrollView,
    Modal,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { createPostWithScene, saveScene, uploadVideo } from '../../api/client';
import { useAppStore } from '../../store';
import {
    PortalRarity,
    SignalMode,
    PortalSettings,
    RARITY_COLORS,
    SIGNAL_MODE_LABELS,
    FaintSignalConfig,
    DistortingConfig,
    LockedOnConfig,
} from '../../types/portal';
import PortalService from '../../services/PortalService';

// ============================================================
// PORTAL CONFIG COMPONENTS
// ============================================================

const RARITY_OPTIONS: PortalRarity[] = ['Common', 'Rare', 'Mythic', 'Anomaly'];
const SIGNAL_MODE_OPTIONS: SignalMode[] = ['AlwaysOn', 'FaintSignal', 'Distorting', 'LockedOn'];

interface RaritySelectorProps {
    selected: PortalRarity;
    onSelect: (rarity: PortalRarity) => void;
}

const RaritySelector = ({ selected, onSelect }: RaritySelectorProps) => (
    <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Portal Rarity</Text>
        <View style={styles.chipsRow}>
            {RARITY_OPTIONS.map((rarity) => (
                <TouchableOpacity
                    key={rarity}
                    style={[
                        styles.chip,
                        selected === rarity && {
                            backgroundColor: RARITY_COLORS[rarity],
                            borderColor: RARITY_COLORS[rarity],
                        }
                    ]}
                    onPress={() => onSelect(rarity)}
                >
                    <Text style={[
                        styles.chipText,
                        selected === rarity && styles.chipTextActive
                    ]}>
                        {rarity}
                    </Text>
                    <Text style={[
                        styles.chipSubtext,
                        selected === rarity && styles.chipTextActive
                    ]}>
                        {PortalService.getRarityMultiplier(rarity)}x Fuel
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

interface SignalModeSelectorProps {
    selected: SignalMode;
    onSelect: (mode: SignalMode) => void;
}

const SignalModeSelector = ({ selected, onSelect }: SignalModeSelectorProps) => {
    const descriptions: Record<SignalMode, string> = {
        AlwaysOn: 'Always visible on the map',
        FaintSignal: 'Appears randomly for limited time daily',
        Distorting: 'Appears at fixed intervals throughout the day',
        LockedOn: 'Binds to specific users permanently',
    };

    return (
        <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Signal Mode</Text>
            {SIGNAL_MODE_OPTIONS.map((mode) => (
                <TouchableOpacity
                    key={mode}
                    style={[
                        styles.modeCard,
                        selected === mode && styles.modeCardActive
                    ]}
                    onPress={() => onSelect(mode)}
                >
                    <View style={styles.modeCardHeader}>
                        <Ionicons
                            name={
                                mode === 'AlwaysOn' ? 'radio' :
                                    mode === 'FaintSignal' ? 'pulse' :
                                        mode === 'Distorting' ? 'cellular' :
                                            'lock-closed'
                            }
                            size={20}
                            color={selected === mode ? theme.colors.primary : theme.colors.textDim}
                        />
                        <Text style={[
                            styles.modeCardTitle,
                            selected === mode && styles.modeCardTitleActive
                        ]}>
                            {SIGNAL_MODE_LABELS[mode]}
                        </Text>
                        {selected === mode && (
                            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                        )}
                    </View>
                    <Text style={styles.modeCardDesc}>{descriptions[mode]}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

interface FaintSignalConfigProps {
    config: FaintSignalConfig;
    onChange: (config: FaintSignalConfig) => void;
}

const FaintSignalConfigView = ({ config, onChange }: FaintSignalConfigProps) => {
    const options: FaintSignalConfig['dailyDurationMinutes'][] = [30, 60, 120];
    const labels = ['30 min', '1 hour', '2 hours'];

    return (
        <View style={styles.configSection}>
            <Text style={styles.configLabel}>Daily Appearance Duration</Text>
            <View style={styles.optionsRow}>
                {options.map((duration, idx) => (
                    <TouchableOpacity
                        key={duration}
                        style={[
                            styles.optionButton,
                            config.dailyDurationMinutes === duration && styles.optionButtonActive
                        ]}
                        onPress={() => onChange({ dailyDurationMinutes: duration })}
                    >
                        <Text style={[
                            styles.optionText,
                            config.dailyDurationMinutes === duration && styles.optionTextActive
                        ]}>
                            {labels[idx]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.configHint}>
                Portal will appear randomly for this duration each day
            </Text>
        </View>
    );
};

interface DistortingConfigProps {
    config: DistortingConfig;
    onChange: (config: DistortingConfig) => void;
}

const DistortingConfigView = ({ config, onChange }: DistortingConfigProps) => {
    const options: DistortingConfig['intervalsPerDay'][] = [6, 12, 24];
    const labels = ['6x (every 4h)', '12x (every 2h)', '24x (every 1h)'];

    return (
        <View style={styles.configSection}>
            <Text style={styles.configLabel}>Daily Intervals</Text>
            <View style={styles.optionsRow}>
                {options.map((intervals, idx) => (
                    <TouchableOpacity
                        key={intervals}
                        style={[
                            styles.optionButton,
                            config.intervalsPerDay === intervals && styles.optionButtonActive
                        ]}
                        onPress={() => onChange({ intervalsPerDay: intervals })}
                    >
                        <Text style={[
                            styles.optionText,
                            config.intervalsPerDay === intervals && styles.optionTextActive
                        ]}>
                            {labels[idx]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.configHint}>
                Portal appears for 20 minutes at each interval
            </Text>
        </View>
    );
};

interface LockedOnConfigProps {
    config: LockedOnConfig;
    onChange: (config: LockedOnConfig) => void;
    onSelectFollowers: () => void;
}

const LockedOnConfigView = ({ config, onChange, onSelectFollowers }: LockedOnConfigProps) => {
    const durationOptions: LockedOnConfig['lockDuration'][] = ['24h', '7d', 'permanent'];
    const durationLabels = ['24 hours', '7 days', 'Permanent'];

    const triggerOptions: LockedOnConfig['lockTrigger'][] = ['proximity', 'scan', 'invite'];
    const triggerLabels = ['Proximity', 'Scan', 'Invite'];

    return (
        <View style={styles.configSection}>
            <Text style={styles.configLabel}>Lock Trigger (for non-selected users)</Text>
            <View style={styles.optionsRow}>
                {triggerOptions.map((trigger, idx) => (
                    <TouchableOpacity
                        key={trigger}
                        style={[
                            styles.optionButton,
                            config.lockTrigger === trigger && styles.optionButtonActive
                        ]}
                        onPress={() => onChange({ ...config, lockTrigger: trigger })}
                    >
                        <Text style={[
                            styles.optionText,
                            config.lockTrigger === trigger && styles.optionTextActive
                        ]}>
                            {triggerLabels[idx]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.configLabel}>Lock Duration</Text>
            <View style={styles.optionsRow}>
                {durationOptions.map((duration, idx) => (
                    <TouchableOpacity
                        key={duration}
                        style={[
                            styles.optionButton,
                            config.lockDuration === duration && styles.optionButtonActive
                        ]}
                        onPress={() => onChange({ ...config, lockDuration: duration })}
                    >
                        <Text style={[
                            styles.optionText,
                            config.lockDuration === duration && styles.optionTextActive
                        ]}>
                            {durationLabels[idx]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.configLabel}>Max Concurrent Locks</Text>
            <View style={styles.optionsRow}>
                {[0, 50, 100, 500].map((count) => (
                    <TouchableOpacity
                        key={count}
                        style={[
                            styles.optionButton,
                            config.maxConcurrentLocks === count && styles.optionButtonActive
                        ]}
                        onPress={() => onChange({ ...config, maxConcurrentLocks: count })}
                    >
                        <Text style={[
                            styles.optionText,
                            config.maxConcurrentLocks === count && styles.optionTextActive
                        ]}>
                            {count === 0 ? 'Unlimited' : count.toString()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.selectFollowersButton} onPress={onSelectFollowers}>
                <Ionicons name="people" size={20} color={theme.colors.primary} />
                <Text style={styles.selectFollowersText}>
                    Select Followers ({config.allowedUserIds?.length || 0} selected)
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
            </TouchableOpacity>

            <Text style={styles.configHint}>
                Selected followers get immediate access. Others can trigger locks via {config.lockTrigger}.
            </Text>
        </View>
    );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const ComposerPublishScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { scene, videoUri, coverImage } = route.params || {};

    const [caption, setCaption] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [showFollowerPicker, setShowFollowerPicker] = useState(false);

    // Portal Settings State
    const [rarity, setRarity] = useState<PortalRarity>('Common');
    const [signalMode, setSignalMode] = useState<SignalMode>('AlwaysOn');
    const [faintConfig, setFaintConfig] = useState<FaintSignalConfig>({ dailyDurationMinutes: 60 });
    const [distortingConfig, setDistortingConfig] = useState<DistortingConfig>({ intervalsPerDay: 12 });
    const [lockedOnConfig, setLockedOnConfig] = useState<LockedOnConfig>({
        lockTrigger: 'proximity',
        lockDuration: 'permanent',
        maxConcurrentLocks: 0,
        allowedUserIds: [],
    });

    // Detect artifact in scene
    const hasArtifact = useMemo(() => {
        if (!scene?.objects) return false;
        return scene.objects.some((obj: any) => obj.artifact && obj.artifact.isArtifact);
    }, [scene]);

    const addPost = useAppStore(state => state.addPost);
    const currentUser = useAppStore(state => state.currentUser);

    const buildPortalSettings = (): PortalSettings => {
        const settings: PortalSettings = {
            rarity,
            signalMode,
            createdAt: new Date().toISOString(),
            randomSeed: Math.floor(Math.random() * 1000000),
        };

        switch (signalMode) {
            case 'FaintSignal':
                settings.faintSignalConfig = faintConfig;
                break;
            case 'Distorting':
                settings.distortingConfig = distortingConfig;
                break;
            case 'LockedOn':
                settings.lockedOnConfig = lockedOnConfig;
                break;
        }

        return settings;
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            // 1. Save Scene
            const { sceneId } = await saveScene(scene);

            // 2. Upload Video
            const { videoId } = await uploadVideo(videoUri);

            // 3. Create Post with Portal Settings
            const portalSettings = buildPortalSettings();

            const newPost = {
                id: Date.now().toString(),
                userId: currentUser?.id || 'u1',
                user: currentUser || { id: 'u1', username: 'me', avatar: 'https://via.placeholder.com/150' },
                caption: caption,
                mediaUri: videoUri,
                coverImage: coverImage,
                likes: 0,
                comments: 0,
                shares: 0,
                isLiked: false,
                date: new Date().toISOString(),
                tags: [],
                category: 'Feed',
                sceneId: sceneId,
                isArtifact: hasArtifact,
                portalSettings, // ← NEW: Portal configuration
            };

            addPost(newPost as any);

            Alert.alert("Published!", "Your portal is live.", [
                { text: "OK", onPress: () => navigation.navigate('PostFeed') }
            ]);

        } catch (error) {
            Alert.alert("Error", "Failed to publish");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>New Portal</Text>
                <TouchableOpacity onPress={handlePublish} disabled={isPublishing}>
                    <Text style={[styles.publishText, isPublishing && { color: 'gray' }]}>
                        {isPublishing ? 'Posting...' : 'Post'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }}>
                {hasArtifact && (
                    <View style={styles.artifactBanner}>
                        <Ionicons name="diamond" size={20} color={theme.colors.secondary} />
                        <Text style={styles.artifactBannerText}>This scene contains an Artifact</Text>
                    </View>
                )}

                {/* Media + Caption */}
                <View style={styles.mediaRow}>
                    {coverImage ? (
                        <Image
                            source={{ uri: coverImage }}
                            style={styles.thumbPreview}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.thumbPlaceholder}>
                            <Ionicons name="videocam-outline" size={24} color="#666" />
                        </View>
                    )}
                    <TextInput
                        style={styles.input}
                        placeholder="Write a caption..."
                        placeholderTextColor="#999"
                        multiline
                        value={caption}
                        onChangeText={setCaption}
                    />
                </View>

                <View style={styles.divider} />

                {/* Portal Settings */}
                <Text style={styles.sectionHeader}>Portal Settings</Text>

                <RaritySelector selected={rarity} onSelect={setRarity} />

                <SignalModeSelector selected={signalMode} onSelect={setSignalMode} />

                {/* Conditional Config based on Signal Mode */}
                {signalMode === 'FaintSignal' && (
                    <FaintSignalConfigView config={faintConfig} onChange={setFaintConfig} />
                )}

                {signalMode === 'Distorting' && (
                    <DistortingConfigView config={distortingConfig} onChange={setDistortingConfig} />
                )}

                {signalMode === 'LockedOn' && (
                    <LockedOnConfigView
                        config={lockedOnConfig}
                        onChange={setLockedOnConfig}
                        onSelectFollowers={() => setShowFollowerPicker(true)}
                    />
                )}
            </ScrollView>

            {/* Follower Picker Modal (placeholder - would need real follower data) */}
            <Modal visible={showFollowerPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Followers</Text>
                            <TouchableOpacity onPress={() => setShowFollowerPicker(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalPlaceholder}>
                            Follower list would be displayed here.{'\n'}
                            Selected: {lockedOnConfig.allowedUserIds?.length || 0}
                        </Text>
                        <TouchableOpacity
                            style={styles.modalDoneButton}
                            onPress={() => setShowFollowerPicker(false)}
                        >
                            <Text style={styles.modalDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    publishText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 },
    scrollContent: { flex: 1, padding: 16 },
    mediaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    thumbPlaceholder: {
        width: 80,
        height: 120,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8
    },
    thumbPreview: { width: 80, height: 120, borderRadius: 8 },
    input: { flex: 1, color: 'white', fontSize: 16, paddingTop: 8 },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 20
    },
    sectionHeader: {
        color: theme.colors.white,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    artifactBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
    },
    artifactBannerText: {
        color: theme.colors.secondary,
        fontWeight: '600',
        fontSize: 14,
    },

    // Selector Styles
    selectorContainer: { marginBottom: 20 },
    selectorLabel: {
        color: theme.colors.textDim,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    chipText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#000',
    },
    chipSubtext: {
        color: theme.colors.textDim,
        fontSize: 11,
        marginTop: 2,
    },

    // Mode Card Styles
    modeCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginBottom: 8,
    },
    modeCardActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(0, 255, 170, 0.1)',
    },
    modeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    modeCardTitle: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    modeCardTitleActive: {
        color: theme.colors.primary,
    },
    modeCardDesc: {
        color: theme.colors.textDim,
        fontSize: 13,
        marginLeft: 30,
    },

    // Config Section Styles
    configSection: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    configLabel: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 8,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    optionButtonActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary,
    },
    optionText: {
        color: theme.colors.text,
        fontSize: 13,
        fontWeight: '500',
    },
    optionTextActive: {
        color: '#000',
    },
    configHint: {
        color: theme.colors.textDim,
        fontSize: 12,
        marginTop: 12,
        fontStyle: 'italic',
    },
    selectFollowersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        marginTop: 12,
        gap: 10,
    },
    selectFollowersText: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '500',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 300,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    modalPlaceholder: {
        color: theme.colors.textDim,
        textAlign: 'center',
        marginTop: 40,
        lineHeight: 24,
    },
    modalDoneButton: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 'auto',
    },
    modalDoneText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
});

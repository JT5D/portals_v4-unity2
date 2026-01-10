import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Modal, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useAppStore } from '../store';
import { libraryService, LibraryAssetType, LibraryItem } from '../services/LibraryService';
import * as DocumentPicker from 'expo-document-picker';
import { Model3DViewer } from '../components/library/Model3DViewer';
import { VideoViewer } from '../components/library/VideoViewer';
import { AudioPlayer } from '../components/library/AudioPlayer';
import { ImageViewer } from '../components/library/ImageViewer';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 3;

const TABS: { id: LibraryAssetType, label: string, icon: any }[] = [
    { id: '3d', label: '3D', icon: 'cube-outline' },
    { id: 'image', label: 'Images', icon: 'image-outline' },
    { id: 'video', label: 'Video', icon: 'videocam-outline' },
    { id: 'audio', label: 'Audio', icon: 'musical-notes-outline' },
];

export const AssetLibraryScreen = () => {
    const navigation = useNavigation();
    const currentUser = useAppStore(state => state.currentUser);
    const [activeTab, setActiveTab] = useState<LibraryAssetType>('3d');
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection Mode
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Upload & Preview State
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<LibraryAssetType>('3d');
    const [previewName, setPreviewName] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            loadLibrary();
        }
    }, [currentUser, activeTab]);

    const loadLibrary = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await libraryService.fetchLibrary(currentUser.id, activeTab);
            setItems(data);
        } catch (e) {
            console.error('Failed to load library', e);
            Alert.alert('Error', 'Failed to load library assets.');
        } finally {
            setLoading(false);
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: getMimeTypes(activeTab),
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const asset = result.assets[0];

            // Validate extension
            // Logic to ensure file type matches active tab explicitly if picker allows loose selection
            // (Though 'type' filter usually handles this)

            setPreviewUri(asset.uri);
            setPreviewName(asset.name);
            setPreviewType(activeTab);

        } catch (e) {
            console.error('Picker error', e);
            Alert.alert('Error', 'Failed to pick file.');
        }
    };

    // Ref for 3D Viewer to capture screenshots
    const modelViewerRef = React.useRef<any>(null);

    const confirmUpload = async () => {
        if (!currentUser || !previewUri) return;
        setIsUploading(true);
        try {
            let thumbUri = undefined;

            // 1. Generate Thumbnail
            if (previewType === 'video') {
                thumbUri = (await VideoThumbnails.getThumbnailAsync(previewUri)).uri;
            } else if (previewType === '3d' && modelViewerRef.current) {
                // Capture screenshot from 3D viewer
                console.log('Capturing 3D snapshot...');
                const snapshot = await modelViewerRef.current.captureSnapshot();
                if (snapshot) {
                    thumbUri = snapshot;
                    console.log('3D Snapshot captured:', thumbUri);
                }
            }

            await libraryService.uploadAsset(
                currentUser.id,
                previewUri,
                previewType,
                previewName,
                thumbUri
            );

            setPreviewUri(null); // Close modal
            loadLibrary(); // Refresh grid
            Alert.alert('Success', 'Asset added to library.');
        } catch (e: any) {
            console.error('Upload failed', e);
            Alert.alert('Upload Failed', e.message || 'Unknown error');
        } finally {
            setIsUploading(false);
        }
    };

    const getMimeTypes = (type: LibraryAssetType): string | string[] => {
        switch (type) {
            case '3d': return ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream', '*/*']; // Wildcard often needed for 3D on specific Androids
            case 'image': return ['image/*'];
            case 'video': return ['video/*'];
            case 'audio': return ['audio/*'];
        }
    };

    // Selection Logic
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
            if (newSet.size === 0) setIsSelectionMode(false);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleLongPress = (id: string) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds(new Set([id]));
        }
    };

    const handlePress = (item: LibraryItem) => {
        if (isSelectionMode) {
            toggleSelection(item.id);
        } else {
            // Open preview reader mode (view only)
            setPreviewUri(item.url);
            setPreviewType(item.type);
            setPreviewName(item.name);
        }
    };

    const handleDelete = async () => {
        if (!currentUser) return;
        Alert.alert(
            "Delete Assets",
            `Are you sure you want to delete ${selectedIds.size} items?`,
            [
                { text: "Cancel", style: 'cancel' },
                {
                    text: "Delete",
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await libraryService.deleteAssets(currentUser.id, Array.from(selectedIds));
                            setSelectedIds(new Set());
                            setIsSelectionMode(false);
                            loadLibrary();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete items.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: LibraryItem }) => {
        const isSelected = selectedIds.has(item.id);

        return (
            <TouchableOpacity
                style={[styles.item, isSelected && styles.selectedItem]}
                onLongPress={() => handleLongPress(item.id)}
                onPress={() => handlePress(item)}
            >
                {item.thumbnailUrl || (item.type === 'image' && item.url) ? (
                    <Image source={{ uri: item.thumbnailUrl || item.url }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons
                            name={TABS.find(t => t.id === item.type)?.icon}
                            size={32}
                            color={theme.colors.textDim}
                        />
                    </View>
                )}
                <View style={styles.itemOverlay}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                </View>
                {isSelectionMode && (
                    <View style={styles.selectionCheck}>
                        <Ionicons
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                            size={24}
                            color={isSelected ? theme.colors.primary : "white"}
                        />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderPreviewContent = () => {
        if (!previewUri) return null;

        // Ensure styles.previewContainer has dimensions
        const previewStyle = { flex: 1, width: '100%' };

        switch (previewType) {
            case '3d':
                return <Model3DViewer ref={modelViewerRef} uri={previewUri} style={previewStyle} />;
            case 'video':
                return <VideoViewer uri={previewUri} style={previewStyle} />;
            case 'audio':
                return <AudioPlayer uri={previewUri} style={{ width: '100%' }} />;
            case 'image':
                return <ImageViewer uri={previewUri} style={previewStyle} resizeMode="contain" />;
            default:
                return null;
        }
    };

    // determine if we are in "Upload Mode" (new file) or "View Mode" (existing url)
    // Simple heuristic: if url starts with 'file://' or 'content://', it's local (upload).
    const isLocalFile = previewUri?.startsWith('file://') || previewUri?.startsWith('content://');

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {isSelectionMode ? (
                    <View style={styles.selectionHeader}>
                        <TouchableOpacity onPress={() => setIsSelectionMode(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{selectedIds.size} Selected</Text>
                        <TouchableOpacity onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                            <Text style={styles.headerTitle}>Library</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePickFile} style={styles.uploadButton}>
                            <Ionicons name="cloud-upload-outline" size={20} color="#000" />
                            <Text style={styles.uploadText}>Upload</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={20}
                            color={activeTab === tab.id ? theme.colors.text : theme.colors.textDim}
                        />
                        <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Grid */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    numColumns={3}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textDim} />
                            <Text style={styles.emptyText}>No {activeTab} assets yet.</Text>
                            <TouchableOpacity onPress={handlePickFile} style={styles.emptyButton}>
                                <Text style={styles.emptyButtonText}>Upload {activeTab}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Preview Modal */}
            <Modal visible={!!previewUri} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setPreviewUri(null)} disabled={isUploading}>
                            <Text style={styles.cancelText}>Close</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {isLocalFile ? 'Preview Upload' : 'Asset Preview'}
                        </Text>
                        {isLocalFile ? (
                            <TouchableOpacity onPress={confirmUpload} disabled={isUploading}>
                                {isUploading ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <Text style={[styles.confirmText, isUploading && { opacity: 0.5 }]}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 40 }} /> // Spacer
                        )}
                    </View>

                    <View style={styles.previewContent}>
                        {renderPreviewContent()}
                    </View>

                    {isLocalFile && (
                        <View style={styles.uploadInfo}>
                            <Text style={styles.filename}>{previewName}</Text>
                            <Text style={styles.helperText}>
                                Ensure you have rights to use this content.
                            </Text>
                        </View>
                    )}
                </View>
            </Modal>
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceHighlight,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectionHeader: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    uploadText: {
        color: '#000',
        fontWeight: '600',
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceHighlight,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.colors.text,
    },
    tabText: {
        fontSize: 12,
        marginTop: 4,
        color: theme.colors.textDim,
    },
    activeTabText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 20,
    },
    item: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH,
        borderWidth: 0.5,
        borderColor: theme.colors.surfaceHighlight,
        position: 'relative',
    },
    selectedItem: {
        opacity: 0.7,
        backgroundColor: theme.colors.surfaceHighlight,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E1E1E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 4,
    },
    itemName: {
        color: 'white',
        fontSize: 10,
    },
    selectionCheck: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        marginTop: 60,
        gap: 16,
    },
    emptyText: {
        color: theme.colors.textDim,
        fontSize: 16,
    },
    emptyButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    emptyButtonText: {
        color: theme.colors.text,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#111',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1E1E1E',
    },
    modalTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelText: {
        color: theme.colors.textDim,
        fontSize: 16,
    },
    confirmText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    previewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2, // Tiny padding
    },
    uploadInfo: {
        padding: 20,
        backgroundColor: '#1E1E1E',
    },
    filename: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    helperText: {
        color: theme.colors.textDim,
        fontSize: 12,
    },
});

import React from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { UnityArView } from '../components/UnityArView';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import UnityView from '@azesmway/react-native-unity';
import { DebugOverlay } from '../components/DebugOverlay';

export const UnityTestScene: React.FC = () => {
    const navigation = useNavigation();
    const unityRef = useRef<UnityView>(null);

    const handleUnityMessage = (message: any) => {
        console.log('[Unity Message]:', message);
    };

    const handlePingUnity = () => {
        const payload = JSON.stringify({ type: 'ping', source: 'rn', ts: Date.now() });
        unityRef.current?.postMessage('BridgeTarget', 'OnMessage', payload);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.header}>
                <Text style={styles.title}>Unity AR Test</Text>
                <Text style={styles.subtitle}>Unity is rendering below</Text>
            </View>
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.pingButton} onPress={handlePingUnity}>
                    <Ionicons name="radio-outline" size={18} color="#000" />
                    <Text style={styles.pingText}>Ping Unity</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>Unity will log {"{type:\"pong\"}"} if handler is wired.</Text>
            </View>
            <UnityArView
                ref={unityRef}
                style={styles.unityView}
                onUnityMessage={handleUnityMessage}
            />
            <DebugOverlay startVisible />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerRow: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    backText: {
        color: '#fff',
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
    },
    unityView: {
        flex: 1,
    },
    actionRow: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    pingButton: {
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pingText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 14,
    },
    hint: {
        color: '#bbb',
        fontSize: 12,
        flex: 1,
    },
});

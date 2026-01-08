import UnityView, { UnityViewMessage } from '@azesmway/react-native-unity';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View, ViewProps } from 'react-native';

// Diagnostic version - remove after debugging
const DIAG_VERSION = 'v2-Jan8-0720';

export interface UnityArViewProps extends ViewProps {
    onUnityMessage?: (message: any) => void;
    onUnityReady?: () => void;
}

export const UnityArView = forwardRef<UnityView, UnityArViewProps>(({ onUnityMessage, onUnityReady, style, ...props }, ref) => {
    const unityRef = useRef<UnityView>(null);
    const [unityReady, setUnityReady] = useState(false);
    const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });
    const [unityLayout, setUnityLayout] = useState({ width: 0, height: 0 });
    const [mountTime] = useState(Date.now());

    useImperativeHandle(ref, () => unityRef.current as UnityView);

    // Diagnostic: Log component lifecycle
    useEffect(() => {
        console.log(`[UnityArView ${DIAG_VERSION}] ========== MOUNTED ==========`);
        console.log(`[UnityArView] Platform: ${Platform.OS} ${Platform.Version}`);
        console.log(`[UnityArView] Mount time: ${new Date(mountTime).toISOString()}`);
        console.log(`[UnityArView] UnityView ref initial: ${unityRef.current ? 'EXISTS' : 'NULL'}`);

        // Check ref after short delay
        const timer1 = setTimeout(() => {
            console.log(`[UnityArView] +500ms: ref=${unityRef.current ? 'EXISTS' : 'NULL'}`);
        }, 500);

        const timer2 = setTimeout(() => {
            console.log(`[UnityArView] +2000ms: ref=${unityRef.current ? 'EXISTS' : 'NULL'}, ready=${unityReady}`);
            console.log(`[UnityArView] Container: ${containerLayout.width}x${containerLayout.height}`);
            console.log(`[UnityArView] Unity: ${unityLayout.width}x${unityLayout.height}`);
        }, 2000);

        return () => {
            console.log(`[UnityArView ${DIAG_VERSION}] ========== UNMOUNTING ==========`);
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    const handleContainerLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        console.log(`[UnityArView] Container layout: ${width}x${height}`);
        setContainerLayout({ width, height });
    };

    const handleUnityLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        console.log(`[UnityArView] Unity view layout: ${width}x${height}`);
        setUnityLayout({ width, height });
    };

    const handleMessage = (message: UnityViewMessage) => {
        console.log(`[UnityArView] Message received:`, message);
        if (message.message) {
            try {
                const data = JSON.parse(message.message);
                console.log(`[UnityArView] Parsed message:`, data);

                if (data.type === 'unity_ready' && !unityReady) {
                    console.log('[UnityArView] ✅ UNITY IS READY!');
                    setUnityReady(true);
                    onUnityReady?.();
                }

                onUnityMessage?.(data);
            } catch (e) {
                console.log(`[UnityArView] Raw message (not JSON):`, message.message);
                onUnityMessage?.(message.message);
            }
        }
    };

    // Show diagnostic overlay if container has no size after mount
    const showDiagnostic = containerLayout.width === 0 || containerLayout.height === 0;

    return (
        <View
            style={[styles.container, style]}
            onLayout={handleContainerLayout}
            {...props}
        >
            {/* Diagnostic banner - shows version to confirm code is running */}
            <View style={styles.diagBanner}>
                <Text style={styles.diagText}>
                    {DIAG_VERSION} | C:{containerLayout.width}x{containerLayout.height} | U:{unityLayout.width}x{unityLayout.height}
                </Text>
            </View>

            <UnityView
                ref={unityRef}
                style={styles.unity}
                onUnityMessage={handleMessage}
                onLayout={handleUnityLayout}
                fullScreen={true}  // TEST: Try fullscreen to see if Unity initializes
            />

            {/* Warning if no layout */}
            {showDiagnostic && (
                <View style={styles.warning}>
                    <Text style={styles.warningText}>Waiting for layout...</Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        backgroundColor: '#1a1a2e', // Dark blue-ish so we can see it
    },
    diagBanner: {
        backgroundColor: '#00ff00',
        padding: 4,
        alignItems: 'center',
    },
    diagText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    unity: {
        flex: 1,
        width: '100%',
    },
    warning: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    warningText: {
        color: '#ff0',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

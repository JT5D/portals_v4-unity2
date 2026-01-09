import UnityView, { UnityViewMessage } from '@artmajeur/react-native-unity';
import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

// === DEBUG CONFIGURATION ===
// Uses __DEV__ which is true in development, false in production builds
const DEBUG_ENABLED = __DEV__;
const LOG_PREFIX = '[UnityArView]';

// Stats tracking (module-level to persist across re-renders)
let messagesReceived = 0;
let messagesSent = 0;

const logDebug = (message: string) => {
    if (!DEBUG_ENABLED) return;
    console.log(`${LOG_PREFIX} ${message}`);
};

const logWarn = (message: string) => {
    if (!DEBUG_ENABLED) return;
    console.warn(`${LOG_PREFIX} ${message}`);
};

const logError = (message: string) => {
    // Always log errors even in production
    console.error(`${LOG_PREFIX} ${message}`);
};

export interface UnityArViewProps extends ViewProps {
    onUnityMessage?: (message: any) => void;
    onUnityReady?: () => void;
}

export interface UnityArViewRef {
    sendMessage: (gameObject: string, method: string, message: string) => void;
    getStats: () => { sent: number; received: number };
}

export const UnityArView = forwardRef<UnityArViewRef, UnityArViewProps>(({ onUnityMessage, onUnityReady, style, ...props }, ref) => {
    const unityRef = useRef<UnityView>(null);
    const [unityReady, setUnityReady] = useState(false);

    // Expose sendMessage with logging wrapper
    useImperativeHandle(ref, () => ({
        sendMessage: (gameObject: string, method: string, message: string) => {
            messagesSent++;
            const truncated = message.length > 80 ? message.substring(0, 80) + '...' : message;
            logDebug(`TX #${messagesSent}: ${gameObject}.${method}(${truncated})`);

            if (!unityRef.current) {
                logError('Cannot send message - UnityView ref is null');
                return;
            }

            try {
                unityRef.current.postMessage(gameObject, method, message);
            } catch (e) {
                logError(`Failed to send message: ${e}`);
            }
        },
        getStats: () => ({ sent: messagesSent, received: messagesReceived }),
    }));

    const handleMessage = useCallback((message: UnityViewMessage) => {
        messagesReceived++;

        if (message.message) {
            const truncated = message.message.length > 100
                ? message.message.substring(0, 100) + '...'
                : message.message;
            logDebug(`RX #${messagesReceived}: ${truncated}`);

            try {
                const data = JSON.parse(message.message);

                // Detect unity_ready message from BridgeTarget.cs Start()
                if (data.type === 'unity_ready' && !unityReady) {
                    logDebug('Unity ready signal received - bridge established');
                    setUnityReady(true);
                    onUnityReady?.();
                }

                // Log specific message types for debugging
                if (data.type === 'pong') {
                    logDebug('Received pong response from Unity');
                } else if (data.type === 'ack') {
                    logDebug(`Unity acknowledged: ${data.note || 'no details'}`);
                } else if (data.type === 'error') {
                    logError(`Unity error: ${data.note || 'no details'}`);
                } else if (data.type === 'stats') {
                    logDebug(`Unity stats: ${data.note}`);
                }

                onUnityMessage?.(data);
            } catch (e) {
                logWarn(`Failed to parse message as JSON, using raw string`);
                onUnityMessage?.(message.message);
            }
        } else {
            logWarn('Received empty message from Unity');
        }
    }, [unityReady, onUnityReady, onUnityMessage]);

    return (
        <View style={[styles.container, style]} {...props}>
            <UnityView
                ref={unityRef}
                style={styles.unity}
                onUnityMessage={handleMessage}
                fullScreen={false}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        // DEBUG: Force minimum dimensions to prevent collapse
        minHeight: 300,
        minWidth: 300,
    },
    unity: {
        flex: 1,
        width: '100%',
        height: '100%',
        // DEBUG: Force minimum dimensions
        minHeight: 300,
        minWidth: 300,
    },
});

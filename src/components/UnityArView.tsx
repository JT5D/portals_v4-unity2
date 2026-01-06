import UnityView, { UnityViewMessage } from '@azesmway/react-native-unity';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

export interface UnityArViewProps extends ViewProps {
    onUnityMessage?: (message: any) => void;
}

export const UnityArView = forwardRef<UnityView, UnityArViewProps>(({ onUnityMessage, style, ...props }, ref) => {
    const unityRef = useRef<UnityView>(null);
    useImperativeHandle(ref, () => unityRef.current as UnityView);

    const handleMessage = (message: UnityViewMessage) => {
        if (onUnityMessage && message.message) {
            try {
                // Attempt to parse JSON message from Unity
                const data = JSON.parse(message.message);
                onUnityMessage(data);
            } catch (e) {
                // Fallback to raw string
                onUnityMessage(message.message);
            }
        }
    };

    /**
     * Helper to send message to Unity
     * @param gameObject The name of the GameObject in the scene
     * @param methodName The name of the method to call
     * @param message The string message (usually JSON)
     */
    const sendMessage = (gameObject: string, methodName: string, message: string) => {
        if (unityRef.current) {
            unityRef.current.postMessage(gameObject, methodName, message);
        }
    };

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
    },
    unity: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});

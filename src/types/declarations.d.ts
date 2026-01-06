declare module '@azesmway/react-native-unity' {
    import React from 'react';
    import { ViewProps } from 'react-native';

    export interface UnityViewMessage {
        name: string;
        data: any;
        callBack?: (data: any) => void;
        message?: string; // Sometimes payload comes as 'message' depending on version
    }

    export interface UnityViewProps extends ViewProps {
        onUnityMessage?: (event: UnityViewMessage) => void;
        fullScreen?: boolean;
    }

    export default class UnityView extends React.Component<UnityViewProps> {
        postMessage(gameObject: string, methodName: string, message: string): void;
        pause(): void;
        resume(): void;
        unload(): void;
    }
}

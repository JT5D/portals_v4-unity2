/// <reference types="react-native/types/modules/codegen" />
/// <reference types="react-native/codegen" />
import React from 'react';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
type UnityViewContentUpdateEvent = Readonly<{
    message: string;
}>;
type RNUnityViewProps = {
    androidKeepPlayerMounted?: boolean;
    fullScreen?: boolean;
    onUnityMessage?: DirectEventHandler<UnityViewContentUpdateEvent>;
    onPlayerUnload?: DirectEventHandler<UnityViewContentUpdateEvent>;
    onPlayerQuit?: DirectEventHandler<UnityViewContentUpdateEvent>;
};
export default class UnityView extends React.Component<RNUnityViewProps> {
    ref: React.RefObject<React.Component<import("./specs/UnityViewNativeComponent").NativeProps, {}, any> & Readonly<import("react-native").NativeMethods>>;
    postMessage: (gameObject: string, methodName: string, message: string) => void;
    unloadUnity: () => void;
    pauseUnity(pause: boolean): void;
    resumeUnity(): void;
    windowFocusChanged(hasFocus?: boolean): void;
    private getProps;
    componentWillUnmount(): void;
    render(): JSX.Element;
}
export {};
//# sourceMappingURL=UnityView.d.ts.map
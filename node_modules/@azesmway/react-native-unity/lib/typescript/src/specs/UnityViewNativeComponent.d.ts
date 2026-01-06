/// <reference types="react" />
/// <reference types="react-native/types/modules/codegen" />
/// <reference types="react-native/codegen" />
import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
export type UnityViewContentUpdateEvent = Readonly<{
    message: string;
}>;
export interface NativeProps extends ViewProps {
    androidKeepPlayerMounted?: boolean;
    fullScreen?: boolean;
    onUnityMessage?: DirectEventHandler<UnityViewContentUpdateEvent>;
    onPlayerUnload?: DirectEventHandler<UnityViewContentUpdateEvent>;
    onPlayerQuit?: DirectEventHandler<UnityViewContentUpdateEvent>;
}
export interface NativeCommands {
    postMessage: (viewRef: React.ElementRef<HostComponent<NativeProps>>, gameObject: string, methodName: string, message: string) => void;
    unloadUnity: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
    pauseUnity: (viewRef: React.ElementRef<HostComponent<NativeProps>>, pause: boolean) => void;
    resumeUnity: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
    windowFocusChanged: (viewRef: React.ElementRef<HostComponent<NativeProps>>, hasFocus: boolean) => void;
}
export declare const Commands: NativeCommands;
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=UnityViewNativeComponent.d.ts.map
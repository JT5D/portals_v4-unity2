import { AnimationClip, Object3D, Quaternion, Vector3 } from "three";
/**
 * @category Animation and Sequencing
 */
export declare type TimelineAssetModel = {
    name: string;
    tracks: TrackModel[];
};
/**
 * @category Animation and Sequencing
 */
export declare enum TrackType {
    Activation = "ActivationTrack",
    Animation = "AnimationTrack",
    Audio = "AudioTrack",
    Control = "ControlTrack",
    Marker = "MarkerTrack",
    Signal = "SignalTrack"
}
/**
 * @category Animation and Sequencing
 */
export declare enum ClipExtrapolation {
    None = 0,
    Hold = 1,
    Loop = 2,
    PingPong = 3,
    Continue = 4
}
/**
 * @category Animation and Sequencing
 */
export declare type TrackModel = {
    name: string;
    type: TrackType;
    muted: boolean;
    outputs: Array<null | string | object>;
    clips?: Array<ClipModel>;
    markers?: Array<MarkerModel>;
    trackOffset?: TrackOffset;
    volume?: number;
};
declare type Vec3 = {
    x: number;
    y: number;
    z: number;
};
declare type Quat = {
    x: number;
    y: number;
    z: number;
    w: number;
};
/**
 * @category Animation and Sequencing
 */
export declare type TrackOffset = {
    position: Vec3 | Vector3;
    rotation: Quat | Quaternion;
};
/**
 * @category Animation and Sequencing
 */
export declare type ClipModel = {
    start: number;
    end: number;
    duration: number;
    timeScale: number;
    asset: any | AudioClipModel | ControlClipModel | AnimationClipModel;
    clipIn: number;
    easeInDuration: number;
    easeOutDuration: number;
    preExtrapolationMode: ClipExtrapolation;
    postExtrapolationMode: ClipExtrapolation;
    reversed?: boolean;
};
/**
 * @category Animation and Sequencing
 */
export declare type AnimationClipModel = {
    clip: string | number | AnimationClip;
    loop: boolean;
    duration: number;
    removeStartOffset: boolean;
    position?: Vec3 | Vector3;
    rotation?: Quat | Quaternion;
};
/**
 * @category Animation and Sequencing
 */
export declare type AudioClipModel = {
    clip: string;
    loop: boolean;
    volume: number;
};
/**
 * @category Animation and Sequencing
 */
export declare type ControlClipModel = {
    sourceObject: string | Object3D;
    controlActivation: boolean;
    updateDirector: boolean;
};
export declare enum MarkerType {
    Signal = "SignalEmitter"
}
/**
 * @category Animation and Sequencing
 */ export declare class MarkerModel {
    type: MarkerType;
    time: number;
}
/**
 * @category Animation and Sequencing
 */
export declare class SignalMarkerModel extends MarkerModel {
    retroActive: boolean;
    emitOnce: boolean;
    asset: string;
}
/**
 * Marker with a name, used for scroll-driven timelines. It is used together with elements in your HTML to define what time in the timeline should be active when the element is in the scroll view.
 *
 * @example Mark html elements to define scroll positions
 * ```html
 * <div data-timeline-marker>...</div>
 * ```
 *
 * @link [Example Project using ScrollMarker](https://scrollytelling-bike-z23hmxb2gnu5a.needle.run/)
 * @category Animation and Sequencing
*/
export type ScrollMarkerModel = MarkerModel & {
    name?: string;
};
export {};

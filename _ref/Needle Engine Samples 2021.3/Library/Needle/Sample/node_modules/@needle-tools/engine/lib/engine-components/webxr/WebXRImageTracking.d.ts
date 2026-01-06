/// <reference types="webxr" />
import { Object3D, Quaternion, Vector3 } from "three";
import { AssetReference } from "../../engine/engine_addressables.js";
import { type NeedleXREventArgs } from "../../engine/xr/api.js";
import { Behaviour } from "../Component.js";
export declare class WebXRTrackedImage {
    get url(): string;
    get widthInMeters(): number;
    get bitmap(): ImageBitmap;
    get model(): WebXRImageTrackingModel;
    readonly measuredSize: number;
    readonly state: "tracked" | "emulated";
    /** Copy the image position to a vector */
    getPosition(vec: Vector3): Vector3;
    /** Copy the image rotation to a quaternion */
    getQuaternion(quat: Quaternion): Quaternion;
    applyToObject(object: Object3D, t01?: number | undefined): void;
    private static _positionBuffer;
    private static _rotationBuffer;
    private _position;
    private _rotation;
    private ensureTransformData;
    private readonly _trackingComponent;
    private readonly _trackedImage;
    private readonly _bitmap;
    private readonly _pose;
    constructor(context: WebXRImageTracking, trackedImage: WebXRImageTrackingModel, bitmap: ImageBitmap, measuredSize: number, state: "tracked" | "emulated", pose: any);
}
/**
 * WebXRImageTracking allows you to track images in the real world and place objects on top of them.
 * This component is only available in WebXR sessions.
 * The WebXRImageTrackingModel contains the image to track, the object to place on top of the image, and the size of the image as well as settings for the tracking.
 * Used by the {@link WebXRImageTracking} component
 */
export declare class WebXRImageTrackingModel {
    constructor(params: {
        url: string;
        widthInMeters: number; /** Object to track */
        object: AssetReference | Object3D;
        createObjectInstance?: boolean;
        imageDoesNotMove?: boolean;
        hideWhenTrackingIsLost?: boolean;
    });
    /**
     * Tracked image marker url. Make sure the image has good contrast and unique features to improve the tracking quality.
     */
    image?: string;
    /** Make sure this matches your physical marker size! Otherwise the tracked object will \"swim\" above or below the marker.
     * @default 0.25 which is equivalent to 25cm
    */
    widthInMeters: number;
    /**
     * The object moved around by the image. Make sure the size matches WidthInMeters.
     */
    object?: AssetReference;
    /**
     * If true, a new instance of the referenced object will be created for each tracked image. Enable this if you're re-using objects for multiple markers.
     */
    createObjectInstance: boolean;
    /** Use this for static images (e.g. markers on the floor). Only the first few frames of new poses will be applied to the model. This will result in more stable tracking.
     * @default false
    */
    imageDoesNotMove: boolean;
    /**
     * Enable to hide the tracked object when the image is not tracked anymore. When disabled the tracked object will stay at the position it was last tracked at.
     * @default true
     */
    hideWhenTrackingIsLost: boolean;
    /**
     * Get the name of the image file from the url
     */
    getNameFromUrl(): string | null;
}
/**
 * Add this component to a object to enable image tracking in WebXR sessions.
 *
 * You need to add at least one {@link WebXRImageTrackingModel} to the `trackedImages` array to define which images to track and which objects to place on top of them.
 *
 * **NOTE:** For Android devices, image tracking currently requires the user to enable the `chrome://flags/#webxr-incubations` flag in Chrome.
 *
 * **NOTE:** For iOS only one image can be tracked at a time. If you have multiple images in the `trackedImages` array, only the first one will be tracked. You can use the {@link setPrimaryImage} method to change which image is tracked before entering the XR session.
 *
 * - Example: https://samples.needle.tools/image-tracking
 *
 * @category XR
 * @group Components
 */
export declare class WebXRImageTracking extends Behaviour {
    /**
     * If you have multiple images in your application to track then this method is useful for iOS AR where only the first image can be tracked.
     * Call this method will set the given image as the first one in the array so it will be used for tracking.
     */
    setPrimaryImage(image: WebXRImageTrackingModel): void;
    /**
     * Add an image to track. If the image is already in the trackedImages array it won't be added again.
     * Note: that adding images at runtime *while* in AR is not supported.
     *
     * @example
     * ```ts
     * const imageTracking = GameObject.getComponent(myGameObject, WebXRImageTracking);
     * const image = new WebXRImageTrackingModel({ url: "https://example.com/my-marker.png", widthInMeters: 0.2, object: myObject });
     * imageTracking.addImage(image, true); // add and set as primary image
     * ```
     */
    addImage(image: WebXRImageTrackingModel, asPrimary?: boolean): void;
    /**
     * List of images to track in the WebXR session. Use {@link WebXRImageTrackingModel} to define each image and the object to place on top of it.
     *
     * Use the `addImage()` and `setPrimaryImage()` methods to modify this array at runtime.
     */
    readonly trackedImages: WebXRImageTrackingModel[];
    /** Applies smoothing based on detected jitter to the tracked image. */
    smooth: boolean;
    private readonly trackedImageIndexMap;
    /** @returns true if image tracking is supported on this device. This may return false at runtime if the user's browser did not enable webxr incubations */
    get supported(): boolean;
    private _supported;
    /** @internal */
    awake(): void;
    /** @internal */
    onEnable(): void;
    /** @internal */
    onDisable(): void;
    private onBeforeUSDZExport;
    /** @internal */
    onBeforeXR(_mode: XRSessionMode, args: XRSessionInit & {
        trackedImages: Array<any>;
    }): void;
    /** @internal */
    onEnterXR(_args: NeedleXREventArgs): void;
    /** @internal */
    onLeaveXR(_args: NeedleXREventArgs): void;
    private readonly imageToObjectMap;
    private readonly currentImages;
    private readonly webXRIncubationsWarning;
    /** @internal */
    onUpdateXR(args: NeedleXREventArgs): void;
    private onImageTrackingUpdate;
}

/// <reference types="webxr" />
import type { IXRRig } from "../../engine/engine_xr.js";
import { type NeedleXREventArgs } from "../../engine/engine_xr.js";
import { Behaviour } from "../Component.js";
/**
 * A user in XR (VR or AR) is parented to an XR rig during the session.
 * When moving through the scene the rig is moved instead of the user.
 *
 * You can create multiple rigs in your scene and switch between them during an active XR session by calling {@link setAsActiveXRRig} on the XRRig instance.
 * For advanced use-cases you can also provide your own XRRig class by implementing the {@link IXRRig} interface and adding it to your scene.
 *
 * @category XR
 * @group Components
 */
export declare class XRRig extends Behaviour implements IXRRig {
    priority: number;
    get isActive(): boolean;
    /**
     * Sets this rig to be the active XR rig (needs to be called during an active XR session)
     * Note that this might modify the priority of this rig to be the highest.
    */
    setAsActiveXRRig(): void;
    /**
     * Sets the priority of the rig.
     */
    setPriority(value: number): void;
    /** @internal */
    awake(): void;
    isXRRig(): boolean;
    supportsXR(_mode: XRSessionMode): boolean;
    private _startScale?;
    /** @internal */
    onEnterXR(args: NeedleXREventArgs): void;
    /** @internal */
    onLeaveXR(args: NeedleXREventArgs): void;
}

import { Component } from "../Component.js";
import { PostProcessingEffect } from "./PostProcessingEffect.js";
export declare function registerCustomEffectType(name: string, effect: typeof PostProcessingEffect): void;
/** @internal */
export declare class VolumeProfile {
    /** effects added to the volume */
    components: PostProcessingEffect[];
    /**
     * call init on all components
     * @hidden
     **/
    __init(owner: Component): void;
    addEffect(effect: PostProcessingEffect): void;
    removeEffect(effect: PostProcessingEffect): void;
}

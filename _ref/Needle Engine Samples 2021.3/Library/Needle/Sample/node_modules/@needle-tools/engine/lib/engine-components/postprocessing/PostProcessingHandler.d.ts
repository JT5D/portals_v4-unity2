import type { Effect, EffectComposer } from "postprocessing";
import { Context } from "../../engine/engine_setup.js";
import { PostProcessingEffect } from "./PostProcessingEffect.js";
/**
 * PostProcessingHandler is responsible for applying post processing effects to the scene. It is internally used by the {@link Volume} component
 */
export declare class PostProcessingHandler {
    private _composer;
    private _lastVolumeComponents?;
    private readonly _effects;
    /**
     * Returns true if a specific effect is currently active in the post processing stack.
     */
    getEffectIsActive(effect: Effect): boolean;
    get isActive(): boolean;
    get composer(): EffectComposer | null;
    private _isActive;
    private readonly context;
    constructor(context: Context);
    apply(components: PostProcessingEffect[]): Promise<void>;
    unapply(dispose?: boolean): void;
    dispose(): void;
    private onApply;
    private _anyPassHasDepth;
    private _anyPassHasNormal;
    private _hasSmaaEffect;
    get anyPassHasDepth(): boolean;
    get anyPassHasNormal(): boolean;
    get hasSmaaEffect(): boolean;
    private _customInputBuffer;
    private _customInputBufferId;
    private _multisampling;
    set multisampling(value: number);
    get multisampling(): number;
    /** Build composer passes */
    private applyEffects;
    /** Should be called before `composer.addPass()` to create an effect pass with all previously collected effects that can be merged up to that point */
    private createPassForMergeableEffects;
    private handleDevicePixelRatio;
    private _menuEntry;
    private _passIndices;
    private _onCreateEffectsDebug;
}

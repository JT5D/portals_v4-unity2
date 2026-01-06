import type { Effect, Pass } from "postprocessing";
import { ConstructorConcrete, IComponent } from "../../engine/engine_types.js";
import { type PostProcessingEffect } from "./PostProcessingEffect.js";
export declare const debug: string | number | boolean;
export type IPostProcessingManager = IComponent & {
    get isPostProcessingManager(): boolean;
    get dirty(): boolean;
    set dirty(value: boolean);
    addEffect(effect: PostProcessingEffect): void;
    removeEffect(effect: PostProcessingEffect): void;
};
export declare function setPostprocessingManagerType(type: ConstructorConcrete<IPostProcessingManager>): void;
export declare function findPostProcessingManager(effect: PostProcessingEffect): IPostProcessingManager | null;
export declare function getPostProcessingManager(effect: PostProcessingEffect): IPostProcessingManager | null;
export type PostprocessingEffectData = {
    effect: Effect | Pass;
    priority?: number;
    typeName?: string | null | undefined;
};
/**
 * Default order for post-processing effects. This can be used to sort effects by their rendering order when creating custom effects.
 * E.g. in your custom effect, you can set `order: PostProcessingEffectOrder.Bloom + 1;` to ensure it gets rendered after the bloom effect.
 * OR `order: PostProcessingEffectOrder.Bloom - 1;` to ensure it gets rendered before the bloom effect.
 * @example
 * ```typescript
 * import { PostProcessingEffectOrder } from "@needle-tools/engine"
 *
 * export class MyCustomEffect extends PostProcessingEffect {
 *    order: PostProcessingEffectPriority.Bloom + 1; // render after bloom
 *
 *    // ... your effect code
 * }
 * ```
 */
export declare const PostProcessingEffectOrder: {
    /** Used to render effects at the start of the post-processing chain */
    AT_START: number;
    NormalPass: number;
    DepthDownsamplingPass: number;
    SSAO: number;
    SMAA: number;
    TiltShift: number;
    DepthOfField: number;
    ChromaticAberration: number;
    Bloom: number;
    Vignette: number;
    Pixelation: number;
    ToneMapping: number;
    HueSaturation: number;
    BrightnessContrast: number;
    Sharpening: number;
    /** Used to render effects at the end of the post-processing chain, e.g. for final adjustments or overlays. */
    AT_END: number;
};
export declare function orderEffects(effects: Array<PostprocessingEffectData>): void;

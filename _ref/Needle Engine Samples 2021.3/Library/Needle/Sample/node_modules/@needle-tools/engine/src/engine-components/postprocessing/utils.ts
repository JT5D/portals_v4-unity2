import type { Effect, Pass } from "postprocessing";
import { Object3D } from "three";

import { isDevEnvironment } from "../../engine/debug/index.js";
import { addComponent } from "../../engine/engine_components.js";
import { foreachComponentEnumerator } from "../../engine/engine_gameobject.js";
import { MODULES } from "../../engine/engine_modules.js";
import { Constructor, ConstructorConcrete, IComponent } from "../../engine/engine_types.js";
import { getParam } from "../../engine/engine_utils.js";
import { type PostProcessingEffect } from "./PostProcessingEffect.js";

export const debug = getParam("debugpost");

export type IPostProcessingManager = IComponent & {
    get isPostProcessingManager(): boolean;
    get dirty(): boolean;
    set dirty(value: boolean);
    addEffect(effect: PostProcessingEffect): void;
    removeEffect(effect: PostProcessingEffect): void;
}


let PostprocessingManagerType: ConstructorConcrete<IPostProcessingManager> | null = null;

export function setPostprocessingManagerType(type: ConstructorConcrete<IPostProcessingManager>) {
    PostprocessingManagerType = type;
}

export function findPostProcessingManager(effect: PostProcessingEffect): IPostProcessingManager | null {
    let obj = effect.gameObject as Object3D | null;
    while (obj) {
        for (const comp of foreachComponentEnumerator(obj)) {
            if ((comp as unknown as IPostProcessingManager).isPostProcessingManager === true) {
                return comp as unknown as IPostProcessingManager;
            }
        }
        obj = obj.parent;
    }
    return null;
}

export function getPostProcessingManager(effect: PostProcessingEffect): IPostProcessingManager | null {
    let manager: IPostProcessingManager | null = findPostProcessingManager(effect);
    if (!manager) {
        if (PostprocessingManagerType) {
            if (debug)
                console.warn("Adding postprocessing manager to the scene.");
            const scene = effect.scene;
            manager = addComponent(scene, PostprocessingManagerType);
        }
        else {
            if (isDevEnvironment())
                console.warn("No post processing manager found");
        }
    }
    return manager;
}



export type PostprocessingEffectData = {
    effect: Effect | Pass;
    priority?: number,
    typeName?: string | null | undefined,
}

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
export const PostProcessingEffectOrder = {
    /** Used to render effects at the start of the post-processing chain */
    AT_START: -10_000,
    
    NormalPass: 0,
    DepthDownsamplingPass: 10,
    SSAO: 20,
    SMAA: 30,
    TiltShift: 40,
    DepthOfField: 50,
    ChromaticAberration: 60,
    Bloom: 70,
    Vignette: 80,
    Pixelation: 90,
    ToneMapping: 100,
    HueSaturation: 110,
    BrightnessContrast: 120,
    Sharpening: 130,
    
    /** Used to render effects at the end of the post-processing chain, e.g. for final adjustments or overlays. */
    AT_END: 10_000,
}
// let effectsOrder: Array<Constructor<Effect | Pass>> | null = null;

let builtinOrder: Map<Constructor<Effect | Pass>, number> | null = null;

export function orderEffects(effects: Array<PostprocessingEffectData>) {
    if (debug === "verbose") console.debug("Before ordering effects", [...effects]);

    if (!builtinOrder) {
        builtinOrder = new Map<Constructor<Effect | Pass>, number>();
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.NormalPass, PostProcessingEffectOrder.NormalPass);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.DepthDownsamplingPass, PostProcessingEffectOrder.DepthDownsamplingPass);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.SMAAEffect, PostProcessingEffectOrder.SMAA);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.SSAOEffect, PostProcessingEffectOrder.SSAO);
        builtinOrder.set(MODULES.POSTPROCESSING_AO.MODULE.N8AOPostPass, PostProcessingEffectOrder.SSAO);
        builtinOrder.set(MODULES.POSTPROCESSING_AO.MODULE.N8AOPass, PostProcessingEffectOrder.SSAO);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.TiltShiftEffect, PostProcessingEffectOrder.TiltShift);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.DepthOfFieldEffect, PostProcessingEffectOrder.DepthOfField);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.ChromaticAberrationEffect, PostProcessingEffectOrder.ChromaticAberration);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.BloomEffect, PostProcessingEffectOrder.Bloom);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.SelectiveBloomEffect, PostProcessingEffectOrder.Bloom);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.VignetteEffect, PostProcessingEffectOrder.Vignette);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.PixelationEffect, PostProcessingEffectOrder.Pixelation);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.ToneMappingEffect, PostProcessingEffectOrder.ToneMapping);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.HueSaturationEffect, PostProcessingEffectOrder.HueSaturation);
        builtinOrder.set(MODULES.POSTPROCESSING.MODULE.BrightnessContrastEffect, PostProcessingEffectOrder.BrightnessContrast);
    }

    // enforce correct order of effects (e.g. DOF before Bloom)
    effects.sort((a, b) => {
        // we use find index here because sometimes constructor names are prefixed with `_`
        // TODO: find a more robust solution that isnt name based (not sure if that exists tho... maybe we must give effect TYPES some priority/index)
        const aidx = typeof a.priority === "number" ? a.priority : builtinOrder!.get(a.effect.constructor as Constructor<Effect | Pass>) ?? Number.NEGATIVE_INFINITY;
        const bidx = typeof b.priority === "number" ? b.priority : builtinOrder!.get(b.effect.constructor as Constructor<Effect | Pass>) ?? Number.NEGATIVE_INFINITY;

        // Unknown effects should be rendered first
        if (aidx === Number.NEGATIVE_INFINITY) {
            if (debug) console.warn("Unknown effect found: ", a.constructor.name, a);
            return 1;
        }
        else if (bidx === Number.NEGATIVE_INFINITY) {
            if (debug) console.warn("Unknown effect found: ", b.constructor.name, b);
            return -1;
        }
        return aidx - bidx;
    });


    if (debug === "verbose") console.debug("After ordering effects", [...effects]);
}



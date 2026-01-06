import type { Effect, Pass } from "postprocessing";
import type { EditorModification, IEditorModification } from "../../engine/engine_editor-sync.js";
import { Component } from "../Component.js";
import type { PostProcessingHandler } from "./PostProcessingHandler.js";
import { IPostProcessingManager } from "./utils.js";
export declare type EffectProviderResult = Effect | Pass | Array<Effect | Pass>;
export declare type PostProcessingEffectContext = {
    handler: PostProcessingHandler;
    components: PostProcessingEffect[];
};
export interface IEffectProvider {
    apply(context: PostProcessingEffectContext): void | undefined | EffectProviderResult;
    unapply(): void;
}
/**
 * PostProcessingEffect is a base class for post processing effects that can be applied to the scene.
 * To create a custom post processing effect, extend this class and override the `onCreateEffect` method and call `registerCustomEffectType` to make it available in the editor.
 * @example
 * ```typescript
 * import { EdgeDetectionMode, SMAAEffect, SMAAPreset } from "postprocessing";
 * export class Antialiasing extends PostProcessingEffect {
 *  get typeName(): string {
 *      return "Antialiasing";
 *  }
 *  @serializable(VolumeParameter)
 *  preset!: VolumeParameter = new VolumeParameter();
 *  onCreateEffect(): EffectProviderResult {
 *    const effect = new SMAAEffect({
 *      preset: SMAAPreset.HIGH,
 *      edgeDetectionMode: EdgeDetectionMode.DEPTH
 *      });
 *      this.preset.onValueChanged = (newValue) => {
 *          effect.applyPreset(newValue);
 *      };
 *      return effect;
 *    }
 * }
 * registerCustomEffectType("Antialiasing", Antialiasing)
 * ```
 *
 * @category Effects
 * @group Components
 */
export declare abstract class PostProcessingEffect extends Component implements IEffectProvider, IEditorModification {
    get isPostProcessingEffect(): boolean;
    /**
     * The order of this effect. The higher the order the later the effect will be applied in the post processing stack.
     * This can be used to control the order of effects when multiple effects are applied.
     * It is recommended to use the PostProcessingEffectOrder constant to order your custom effects before or after built-in effects.
     * @default `undefined` (no specific order set, will be applied in the order of registration)
     *
     * @example
     * ```typescript
     * import { PostProcessingEffectOrder } from "@needle-tools/engine"
     *
     * export class MyCustomEffect extends PostProcessingEffect {
     *    order: PostProcessingEffectOrder.Bloom + 1; // render after bloom
     *    // This will ensure that the effect is applied after the bloom effect in the post processing stack.
     *    // ... the rest of your effect code
     * }
     * ```
     */
    order: number | undefined;
    constructor(params?: any);
    abstract get typeName(): string;
    /**
     * Whether the effect is active or not. Prefer using `enabled` instead.
     * @deprecated
     */
    active: boolean;
    private _manager;
    onEnable(): void;
    onDisable(): void;
    protected onEffectEnabled(manager?: IPostProcessingManager): void;
    /** override to initialize bindings on parameters */
    init(): void;
    /** previously created effect (if any) */
    private _result;
    private _postprocessingContext;
    protected get postprocessingContext(): PostProcessingEffectContext | null;
    /** Apply post settings. Make sure to call super.apply() if you also create an effect */
    apply(ctx: PostProcessingEffectContext): void | undefined | EffectProviderResult;
    /** Reset previously set values (e.g. when adjusting settings on the renderer like Tonemapping) */
    unapply(): void;
    /** implement to create a effect once to be cached in the base class. Make sure super.apply() is called if you also override apply */
    onCreateEffect?(): EffectProviderResult | undefined;
    dispose(): void;
    private initParameters;
    onEditorModification(modification: EditorModification): void | boolean | undefined;
}

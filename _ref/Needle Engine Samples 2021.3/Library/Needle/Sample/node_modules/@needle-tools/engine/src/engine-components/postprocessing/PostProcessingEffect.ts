import type { Effect, Pass } from "postprocessing";

import type { EditorModification, IEditorModification } from "../../engine/engine_editor-sync.js";
import { serializable } from "../../engine/engine_serialization.js";
import { getParam } from "../../engine/engine_utils.js";
import { Component } from "../Component.js";
import type { PostProcessingHandler } from "./PostProcessingHandler.js";
import { getPostProcessingManager, IPostProcessingManager } from "./utils.js";
import { VolumeParameter } from "./VolumeParameter.js";

const debug = getParam("debugpost");

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
export abstract class PostProcessingEffect extends Component implements IEffectProvider, IEditorModification {

    get isPostProcessingEffect() { return true; }

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
    order: number | undefined = undefined;

    constructor(params: any = undefined) {
        super();
        if (params) {
            for (const key of Object.keys(params)) {
                const value = params[key];
                const param = this[key];
                if (param instanceof VolumeParameter) {
                    param.initialize(value);
                }
                // allow assigning values to properties that are not VolumeParameters
                // this is useful when effects are created in code
                else if (param !== undefined) {
                    this[key] = value;
                }
            }
        }
    }

    abstract get typeName(): string;

    /** 
     * Whether the effect is active or not. Prefer using `enabled` instead.
     * @deprecated
     */
    @serializable()
    active: boolean = true;

    private _manager: IPostProcessingManager | null = null;

    onEnable(): void {
        super.onEnable();
        if (debug) console.warn("Enable", this.constructor.name + (!this.__internalDidAwakeAndStart ? " (awake)" : ""));
        // Dont override the serialized value by enabling (we could also just disable this component / map enabled to active)
        if (this.__internalDidAwakeAndStart)
            this.active = true;
        this.onEffectEnabled();
    }

    onDisable(): void {
        super.onDisable();
        if (debug) console.warn("Disable", this.constructor.name);
        this._manager?.removeEffect(this);
        this.active = false;
    }

    protected onEffectEnabled(manager?: IPostProcessingManager) {
        if (manager && manager.isPostProcessingManager === true) this._manager = manager;
        else if (!this._manager) this._manager = getPostProcessingManager(this);
        this._manager!.addEffect(this);
        this._manager!.dirty = true;
    }

    /** override to initialize bindings on parameters */
    init() { }

    /** previously created effect (if any) */
    private _result: void | undefined | EffectProviderResult;
    private _postprocessingContext: PostProcessingEffectContext | null = null;
    protected get postprocessingContext() { return this._postprocessingContext; }

    /** Apply post settings. Make sure to call super.apply() if you also create an effect */
    apply(ctx: PostProcessingEffectContext): void | undefined | EffectProviderResult {
        this._postprocessingContext = ctx;
        if (!this._result) {
            this.initParameters();
            this._result = this.onCreateEffect?.call(this);
        }
        // TODO: calling this twice because otherwise the Postprocessing sample doesnt look correct. Need to investigate which effect is causing this (init parameters should be refactored either way https://linear.app/needle/issue/NE-5182)
        if (this._result) {
            this.initParameters();
        }
        return this._result;
    }

    /** Reset previously set values (e.g. when adjusting settings on the renderer like Tonemapping) */
    unapply(): void { }

    /** implement to create a effect once to be cached in the base class. Make sure super.apply() is called if you also override apply */
    onCreateEffect?(): EffectProviderResult | undefined

    dispose() {
        if (debug) console.warn("DISPOSE", this)
        if (this._result) {
            if (Array.isArray(this._result)) {
                this._result.forEach(r => r.dispose());
            } else {
                this._result.dispose();
            }
        }
        this._result = undefined;
    }

    private initParameters() {
        // Automatically call init on all VolumeParameter properties
        // This will enforce the valueProcessor and onValueChanged to be called
        const keys = Object.keys(this);
        for (const key of keys) {
            const value = this[key];
            if (value instanceof VolumeParameter) {
                value.__init();
            }
        }
    }

    // TODO this is currently not used for post processing effects that are part of Volume stacks,
    // since these handle that already.
    onEditorModification(modification: EditorModification): void | boolean | undefined {
        // Handle a property modification if the property is a VolumeParameter and the modification is just a plain value
        const key = modification.propertyName;
        if (this[key] instanceof VolumeParameter) {
            const value = modification.value;
            this[key].value = value;
            return true;
        }
    }

}
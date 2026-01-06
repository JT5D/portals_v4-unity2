import type { Effect, EffectComposer, Pass, ToneMappingEffect as _TonemappingEffect } from "postprocessing";
import { Camera as Camera3, DepthTexture, HalfFloatType, LinearFilter, NoToneMapping, Scene, Texture, ToneMapping, WebGLRenderTarget } from "three";

import { showBalloonWarning } from "../../engine/debug/index.js";
// import { internal_SetSharpeningEffectModule } from "./Effects/Sharpening.js";
import { MODULES } from "../../engine/engine_modules.js";
import { Context } from "../../engine/engine_setup.js";
import { Graphics } from "../../engine/engine_three_utils.js";
import { Constructor } from "../../engine/engine_types.js";
import { getParam } from "../../engine/engine_utils.js";
import { Camera } from "../Camera.js";
import { threeToneMappingToEffectMode } from "./Effects/Tonemapping.utils.js";
import { PostProcessingEffect, PostProcessingEffectContext } from "./PostProcessingEffect.js";
import { orderEffects, PostprocessingEffectData, PostProcessingEffectOrder } from "./utils.js";

declare const NEEDLE_USE_POSTPROCESSING: boolean;
globalThis["NEEDLE_USE_POSTPROCESSING"] = globalThis["NEEDLE_USE_POSTPROCESSING"] !== undefined ? globalThis["NEEDLE_USE_POSTPROCESSING"] : true;


const debug = getParam("debugpost");

const activeKey = Symbol("needle:postprocessing-handler");
const autoclearSetting = Symbol("needle:previous-autoclear-state");
const previousToneMapping = Symbol("needle:previous-tone-mapping");

/**
 * PostProcessingHandler is responsible for applying post processing effects to the scene. It is internally used by the {@link Volume} component
 */
export class PostProcessingHandler {

    private _composer: EffectComposer | null = null;
    private _lastVolumeComponents?: PostProcessingEffect[];
    private readonly _effects: Array<PostprocessingEffectData> = [];

    /**
     * Returns true if a specific effect is currently active in the post processing stack.
     */
    getEffectIsActive(effect: Effect): boolean {
        if (!effect) return false;
        return this._isActive && this._effects.some(e => e.effect === effect);
    }

    get isActive() {
        return this._isActive;
    }

    get composer() {
        return this._composer;
    }

    private _isActive: boolean = false;
    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    apply(components: PostProcessingEffect[]): Promise<void> {
        if ("env" in import.meta && import.meta.env.VITE_NEEDLE_USE_POSTPROCESSING === "false") {
            if (debug) console.warn("Postprocessing is disabled via vite env setting");
            else console.debug("Postprocessing is disabled via vite env setting");
            return Promise.resolve();
        }
        if (!NEEDLE_USE_POSTPROCESSING) {
            if (debug) console.warn("Postprocessing is disabled via global vite define setting");
            else console.debug("Postprocessing is disabled via vite define");
            return Promise.resolve();
        }

        this._isActive = true;
        return this.onApply(this.context, components);
    }

    unapply(dispose: boolean = true) {
        if (debug) console.log("Unapplying postprocessing effects");
        this._isActive = false;
        if (this._lastVolumeComponents) {
            for (const component of this._lastVolumeComponents) {
                component.unapply();
            }
            this._lastVolumeComponents.length = 0;
        }
        const context = this.context;
        const active = context[activeKey] as PostProcessingHandler | null;
        if (active === this) {
            delete context[activeKey];

            // Restore the auto clear setting
            if (typeof context.renderer[autoclearSetting] === "boolean") {
                context.renderer.autoClear = context.renderer[autoclearSetting];
            }
            if (typeof context.renderer[previousToneMapping] === "number") {
                context.renderer.toneMapping = context.renderer[previousToneMapping] as ToneMapping;
            }
        }

        this._composer?.removeAllPasses();
        if (dispose) this._composer?.dispose();

        if (context.composer === this._composer) {
            context.composer = null;
        }

        this.handleDevicePixelRatio();
    }

    dispose() {
        this.unapply(true);

        for (const effect of this._effects) {
            effect.effect.dispose();
        }
        this._effects.length = 0;
        this._composer = null;
    }

    private async onApply(context: Context, components: PostProcessingEffect[]) {

        if (!components) return;

        // IMPORTANT
        // Load postprocessing modules ONLY here to get lazy loading of the postprocessing package
        await Promise.all([
            MODULES.POSTPROCESSING.load(),
            MODULES.POSTPROCESSING_AO.load(),
            // import("./Effects/Sharpening.effect")
        ]);


        // try {
        //     internal_SetSharpeningEffectModule(modules[2]);
        // }
        // catch (err) {
        //     console.error(err);
        // }

        context[activeKey] = this;

        if (debug) console.log("Apply Postprocessing Effects", components);

        this._lastVolumeComponents = [...components];

        // store all effects in an array to apply them all in one pass
        // const effects: Array<Effect | Pass> = [];
        this._effects.length = 0;


        // TODO: if an effect is added or removed during the loop this might not be correct anymore
        const ctx: PostProcessingEffectContext = {
            handler: this,
            components: this._lastVolumeComponents,
        }
        for (let i = 0; i < this._lastVolumeComponents.length; i++) {
            const component = this._lastVolumeComponents[i];
            //@ts-ignore
            component.context = context;
            if (component.apply) {
                if (component.active) {
                    if (!context.mainCameraComponent) {
                        console.error("No camera in scene found or available yet - can not create postprocessing effects");
                        return;
                    }
                    // apply or collect effects
                    const res = component.apply(ctx);
                    if (!res) continue;

                    const name = component.typeName || component.constructor.name;

                    if (Array.isArray(res)) {
                        for (const effect of res) {
                            if (!validateEffect(name, effect)) continue;
                            this._effects.push({
                                effect,
                                typeName: component.typeName,
                                priority: component.order
                            });
                        }
                    }
                    else {
                        if (!validateEffect(name, res)) continue;
                        this._effects.push({
                            effect: res,
                            typeName: component.typeName,
                            priority: component.order
                        });
                    }

                    function validateEffect(source: string, effect: Effect | Pass): boolean {
                        if (!effect) {
                            return false;
                        }
                        if (!(effect instanceof MODULES.POSTPROCESSING.MODULE.Effect || effect instanceof MODULES.POSTPROCESSING.MODULE.Pass)) {
                            console.warn(`PostprocessingEffect ${source} created neither Effect nor Pass - this might be caused by a bundler error or false import. Below you find some possible solutions:\n- If you create custom effect try creating it like this: 'new NEEDLE_ENGINE_MODULES.POSTPROCESSING.MODULE.Effect(...)' instead of 'new Effect(...)'`);
                        }
                        return true;
                    }
                }
            }
            else {
                if (component.active)
                    showBalloonWarning("Volume component is not a VolumeComponent: " + component["__type"]);
            }
        }

        this.applyEffects(context);
    }

    private _anyPassHasDepth = false;
    private _anyPassHasNormal = false;
    private _hasSmaaEffect = false;

    get anyPassHasDepth() { return this._anyPassHasDepth; }
    get anyPassHasNormal() { return this._anyPassHasNormal; }
    get hasSmaaEffect() { return this._hasSmaaEffect; }



    private _customInputBuffer: WebGLRenderTarget<Texture> | null = null;
    private _customInputBufferId = 0;
    private _multisampling: number = 0;
    set multisampling(value: number) {
        this._multisampling = value;
    }
    get multisampling() {
        return this._multisampling;
    }


    /** Build composer passes */
    private applyEffects(context: Context) {
        // Reset state
        this._anyPassHasDepth = false;
        this._anyPassHasNormal = false;
        this._hasSmaaEffect = false;

        if (this._effects.length <= 0) {
            return;
        }

        const camera = context.mainCameraComponent as Camera;
        const renderer = context.renderer;
        const scene = context.scene;
        const cam = camera.threeCamera;

        // Store the auto clear setting because the postprocessing composer just disables it
        // and when we disable postprocessing we want to restore the original setting
        // https://github.com/pmndrs/postprocessing/blob/271944b74b543a5b743a62803a167b60cc6bb4ee/src/core/EffectComposer.js#L230C12-L230C12
        // First we need to get the previously set autoClear setting, if it exists
        if (typeof renderer[autoclearSetting] === "boolean") {
            renderer.autoClear = renderer[autoclearSetting];
        }
        renderer[autoclearSetting] = renderer.autoClear;

        if (typeof renderer[previousToneMapping] === "number") {
            renderer.toneMapping = renderer[previousToneMapping] as ToneMapping;
        }
        renderer[previousToneMapping] = renderer.toneMapping;

        // Ensure that we have a tonemapping effect if the renderer is set to use a tone mapping
        if (renderer.toneMapping != NoToneMapping) {
            if (!this._effects.find(e => e instanceof MODULES.POSTPROCESSING.MODULE.ToneMappingEffect)) {
                const tonemapping = new MODULES.POSTPROCESSING.MODULE.ToneMappingEffect();
                tonemapping.name = `ToneMapping (${renderer.toneMapping})`;
                tonemapping.mode = threeToneMappingToEffectMode(renderer.toneMapping);
                this._effects.push({
                    typeName: "ToneMapping",
                    effect: tonemapping,
                    priority: PostProcessingEffectOrder.ToneMapping
                });
            }
        }

        // create composer and set active on context
        if (!this._composer) {
            // const hdrRenderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: HalfFloatType });
            this._composer = new MODULES.POSTPROCESSING.MODULE.EffectComposer(renderer, {
                frameBufferType: HalfFloatType,
                stencilBuffer: true,
            });
        }

        if (context.composer && context.composer !== this._composer) {
            console.warn("There's already an active EffectComposer in your scene: replacing it with a new one. This might cause unexpected behaviour. Make sure to only use one PostprocessingManager/Volume in your scene.");
        }

        context.composer = this._composer;
        const composer = context.composer;
        composer.setMainCamera(cam);
        composer.setRenderer(renderer);
        composer.setMainScene(scene);
        composer.autoRenderToScreen = true; // Must be enabled because it might be disabled during addPass by the composer itself (depending on the effect's settings or order)
        composer.multisampling = 0; // Disable multisampling by default

        for (const prev of composer.passes)
            prev.dispose();
        composer.removeAllPasses();

        // Render to screen pass
        const screenpass = new MODULES.POSTPROCESSING.MODULE.RenderPass(scene, cam);
        screenpass.name = "RenderPass";
        screenpass.mainScene = scene;
        composer.addPass(screenpass);

        const screenPassRender = screenpass.render;
        this._customInputBuffer?.dispose();
        this._customInputBuffer = null;
        screenpass.render = (renderer, inputBuffer, outputBuffer, deltaTime, stencilTest) => {
            if (!inputBuffer) return;

            // screenPassRender.call(screenpass, renderer, inputBuffer, outputBuffer, deltaTime, stencilTest);
            // return;

            // Make sure multisampling is disabled on the composer buffers. Technically a user could still set multisampling directly on the composer so this is to override that and make sure these textures do NOT use multisampling
            inputBuffer.samples = 0;
            if (outputBuffer) {
                outputBuffer.samples = 0;
            }

            // Make sure the input buffer is a WebGLRenderTarget with the correct settings
            if (!this._customInputBuffer
                || this._customInputBuffer.width !== inputBuffer.width
                || this._customInputBuffer.height !== inputBuffer.height
                || this._customInputBuffer.samples !== this._multisampling
                || this._customInputBuffer.texture.format !== inputBuffer.texture.format
                || this._customInputBuffer.texture.type !== HalfFloatType
            ) {
                this._customInputBuffer?.dispose();

                this._customInputBuffer = new WebGLRenderTarget(inputBuffer.width, inputBuffer.height, {
                    format: inputBuffer.texture.format,
                    type: HalfFloatType,
                    depthBuffer: inputBuffer.depthBuffer,
                    depthTexture: inputBuffer.depthTexture
                        ? new DepthTexture(inputBuffer.width, inputBuffer.height)
                        : undefined,
                    stencilBuffer: inputBuffer.stencilBuffer,
                    samples: Math.max(0, this._multisampling),
                    minFilter: inputBuffer.texture.minFilter ?? LinearFilter,
                    magFilter: inputBuffer.texture.magFilter ?? LinearFilter,
                    generateMipmaps: inputBuffer.texture.generateMipmaps,
                });
                this._customInputBufferId++;
                this._customInputBuffer.texture.name = `CustomInputBuffer-${this._customInputBufferId}`;
                if (this._customInputBuffer.depthTexture && inputBuffer.depthTexture) {
                    this._customInputBuffer.depthTexture.format = inputBuffer.depthTexture.format;
                    this._customInputBuffer.depthTexture.type = inputBuffer.depthTexture.type;
                }
                // https://github.com/pmndrs/postprocessing/blob/ad338df710ef41fee4e5d10ad2c2c299030d46ef/src/core/EffectComposer.js#L366
                if (this._customInputBuffer.samples > 0)
                    (this._customInputBuffer as any).ignoreDepthForMultisampleCopy = false;

                if (debug) console.warn(`[PostProcessing] Input buffer created with size ${this._customInputBuffer.width}x${this._customInputBuffer.height} and samples ${this._customInputBuffer.samples}`);
            }
            // Calling the original render function with the input buffer
            screenPassRender.call(screenpass, renderer, this._customInputBuffer, outputBuffer, deltaTime, stencilTest);
            // Blit the resulting buffer to the input buffer passed in by the composer so it's used for subsequent effects
            Graphics.blit(this._customInputBuffer.texture, inputBuffer, {
                renderer,
                depthTexture: this._customInputBuffer.depthTexture,
                depthWrite: true,
                depthTest: true,
            });
        };


        try {
            orderEffects(this._effects);

            let foundTonemappingEffect = false;
            let activeTonemappingEffect: _TonemappingEffect | null = null;
            for (let i = this._effects.length - 1; i >= 0; i--) {
                const ef = this._effects[i].effect;
                if (ef instanceof MODULES.POSTPROCESSING.MODULE.ToneMappingEffect) {
                    // If we already have a tonemapping effect, we can skip this one
                    if (foundTonemappingEffect) {
                        if (debug) console.warn(`[PostProcessing] Found multiple tonemapping effects in the scene: ${ef.name} and ${activeTonemappingEffect?.name}. Only the last one added will be used.`);
                        this._effects.splice(i, 1);
                        continue;
                    }
                    activeTonemappingEffect = ef;
                    foundTonemappingEffect = true;
                }
            }

            const effectsToMerge: Array<Effect> = [];
            let hasConvolutionEffectInArray = false;

            for (let i = 0; i < this._effects.length; i++) {
                const entry = this._effects[i];
                const ef = entry.effect;

                if (ef instanceof MODULES.POSTPROCESSING.MODULE.SMAAEffect) {
                    this._hasSmaaEffect = true;
                }
                else if (ef instanceof MODULES.POSTPROCESSING.MODULE.NormalPass) {
                    this._anyPassHasNormal = true;
                }

                // There can be only one tonemapping effect in the scene, so we skip all others
                if (ef instanceof MODULES.POSTPROCESSING.MODULE.ToneMappingEffect && activeTonemappingEffect !== ef) {
                    // If we already have a tonemapping effect, we can skip this one
                    continue;
                }

                // We can also not merge multiple effects of the same type in one pass
                // So we first need to create a new pass with whatever effects we have so far
                // TODO: this seems to work fine for some effects (like ColorAdjustments) and only caused issues with multiple Tonemapping effects so far which is handled above
                // const constructor = ef.constructor;
                // if (effectsToMerge.find(e => e.constructor === constructor)) {
                //     this.createPassForMergeableEffects(effectsToMerge, composer, cam, scene);
                // }



                if (ef instanceof MODULES.POSTPROCESSING.MODULE.Effect) {
                    const attributes = ef.getAttributes();
                    const convolution = MODULES.POSTPROCESSING.MODULE.EffectAttribute.CONVOLUTION;
                    if (attributes & convolution) {
                        if (debug) console.log("[PostProcessing] Convolution effect: " + ef.name);
                        if (hasConvolutionEffectInArray) {
                            if (debug) console.log("[PostProcessing] → Merging effects [" + effectsToMerge.map(e => e.name).join(", ") + "]");
                            this.createPassForMergeableEffects(effectsToMerge, composer, cam, scene);
                        }
                        hasConvolutionEffectInArray = true;
                    }
                    // Otherwise we can merge it
                    effectsToMerge.push(ef as Effect);
                }
                else if (ef instanceof MODULES.POSTPROCESSING.MODULE.Pass) {
                    hasConvolutionEffectInArray = false;
                    this.createPassForMergeableEffects(effectsToMerge, composer, cam, scene);
                    ef.renderToScreen = false;
                    composer.addPass(ef as Pass);
                }
                else {
                    // seems some effects are not correctly typed, but three can deal with them,
                    // so we might need to just pass them through
                    hasConvolutionEffectInArray = false;
                    this.createPassForMergeableEffects(effectsToMerge, composer, cam, scene);
                    composer.addPass(ef);
                }

            }

            this.createPassForMergeableEffects(effectsToMerge, composer, cam, scene);
        }
        catch (e) {
            console.error("Error while applying postprocessing effects", e);
            composer.passes.forEach(p => p.dispose());
            composer.removeAllPasses();
        }

        // The last pass is the one that renders to the screen, so we need to set the gamma correction for it (and enable it for all others)
        let foundEnabled = false;
        for (let i = composer.passes.length - 1; i >= 0; i--) {
            const pass = composer.passes[i];
            let gammaCorrect = false;
            let renderToScreen = false;
            if (pass.enabled) {
                if (!foundEnabled) {
                    gammaCorrect = true;
                    renderToScreen = true;
                }
                foundEnabled = true;
            }
            pass.renderToScreen = renderToScreen;

            if ((pass as any)?.configuration !== undefined) {
                (pass as any).configuration.gammaCorrection = gammaCorrect;
            }
            else if ("autosetGamma" in pass) {
                // Some effects have a autosetGamma property that we can use to set the gamma correction
                pass.autosetGamma = gammaCorrect;
            }


            this._anyPassHasDepth ||= pass.needsDepthTexture;

        }

        
        this.handleDevicePixelRatio();

        

        // DEBUG LAND BELOW
        if (debug) console.log("[PostProcessing] Passes →", [...composer.passes], "\n---------------------------------\n• " + composer.passes.map(i => i.name || (i.constructor.name + "*")).join("\n• ") + "\n");
        if (debug) this._onCreateEffectsDebug(this._composer!, cam);
    }



    /** Should be called before `composer.addPass()` to create an effect pass with all previously collected effects that can be merged up to that point */
    private createPassForMergeableEffects(effects: Array<Effect>, composer: EffectComposer, camera: Camera3, scene: Scene) {
        if (effects.length > 0) {
            const pass = new MODULES.POSTPROCESSING.MODULE.EffectPass(camera, ...effects);
            pass.name = effects.map(e => e.name).join(", ");
            pass.mainScene = scene;
            pass.enabled = true;
            pass.renderToScreen = false;
            composer.addPass(pass);
            effects.length = 0; // Clear effects after adding them to the pass
        }
    }


    private handleDevicePixelRatio() {
        // Keep user device pixel ratio (if any) https://linear.app/needle/issue/NE-6661
        if (typeof this.context.devicePixelRatio === "number") {
            this.context.requestSizeUpdate();
        }
    }


    private _menuEntry: HTMLSelectElement | null = null;
    private _passIndices: number[] | null = null;

    private _onCreateEffectsDebug(composer: EffectComposer, cam: Camera3) {
        if (debug === "passes") {
            // DepthEffect for debugging purposes, disabled by default, can be selected in the debug pass select
            const depthEffect = new MODULES.POSTPROCESSING.MODULE.DepthEffect({
                blendFunction: MODULES.POSTPROCESSING.MODULE.BlendFunction.NORMAL,
                inverted: true,
            });
            depthEffect.name = "Depth Effect";
            const depthPass = new MODULES.POSTPROCESSING.MODULE.EffectPass(cam, depthEffect);
            depthPass.name = "Depth Effect Pass";
            depthPass.enabled = false;
            composer.passes.push(depthPass);

            if (this._passIndices !== null) {
                const newPasses = [composer.passes[0]];
                if (this._passIndices.length > 0) {
                    newPasses.push(...this._passIndices
                        .filter(x => x !== 0)
                        .map(index => composer.passes[index])
                        .filter(pass => pass)
                    );
                }
                if (newPasses.length > 0) {
                    console.log("[PostProcessing] Passes (selected) →", newPasses);
                }
                composer.passes.length = 0;
                for (const pass of newPasses) {
                    pass.enabled = true;
                    pass.renderToScreen = false; // allows automatic setting for the last pass
                    composer.addPass(pass);
                }
            }

            const menu = this.context.menu;
            if (menu && this._passIndices === null) {
                if (this._menuEntry)
                    this._menuEntry.remove();

                const select = document.createElement("select");
                select.multiple = true;
                const defaultOpt = document.createElement("option");
                defaultOpt.innerText = "Final Output";
                defaultOpt.value = "-1";
                select.appendChild(defaultOpt);
                for (const eff of composer.passes) {
                    const opt = document.createElement("option");
                    opt.innerText = eff.name;
                    opt.value = `${composer.passes.indexOf(eff)}`;
                    opt.title = eff.name;
                    select.appendChild(opt);
                }
                menu.appendChild(select);
                this._menuEntry = select;
                select.addEventListener("change", () => {
                    const indices = Array.from(select.selectedOptions).map(option => parseInt(option.value));
                    if (indices.length === 1 && indices[0] === -1) {
                        this._passIndices = null;
                    }
                    else {
                        this._passIndices = indices;
                    }
                    this.applyEffects(this.context);
                });
            }
        }
    }

}


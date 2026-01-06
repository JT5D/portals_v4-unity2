import type { DepthDownsamplingPass, NormalPass, SSAOEffect } from "postprocessing";
import { Color, PerspectiveCamera } from "three";

import { MODULES } from "../../../engine/engine_modules.js";
import { serializable } from "../../../engine/engine_serialization.js";
import { type EffectProviderResult, PostProcessingEffect } from "../PostProcessingEffect.js";
import { VolumeParameter } from "../VolumeParameter.js";
import { registerCustomEffectType } from "../VolumeProfile.js";

/** Screenspace Ambient Occlusion post-processing effect.  
 * We recommend using ScreenSpaceAmbientOcclusionN8 instead.  
 * @category Effects
 * @group Components
 */
export class ScreenSpaceAmbientOcclusion extends PostProcessingEffect {

    get typeName() {
        return "ScreenSpaceAmbientOcclusion";
    }

    @serializable(VolumeParameter)
    readonly intensity: VolumeParameter = new VolumeParameter(2);

    @serializable(VolumeParameter)
    readonly falloff: VolumeParameter = new VolumeParameter(1);

    @serializable(VolumeParameter)
    readonly samples: VolumeParameter = new VolumeParameter(9);

    @serializable(VolumeParameter)
    readonly color: VolumeParameter = new VolumeParameter(new Color(0, 0, 0));

    @serializable(VolumeParameter)
    readonly luminanceInfluence: VolumeParameter = new VolumeParameter(.7);

    onBeforeRender() {
        if (this._ssao && this.context.mainCamera instanceof PerspectiveCamera) {
            const fadeDistance = this.context.mainCamera.far - this.context.mainCamera.near;
            this._ssao.ssaoMaterial.worldDistanceFalloff = fadeDistance * .01;
            this._ssao.ssaoMaterial.worldDistanceThreshold = this.context.mainCamera.far;
        }
    }

    private _ssao?: SSAOEffect;

    onCreateEffect(): EffectProviderResult {

        const cam = this.context.mainCamera! as PerspectiveCamera;
        const normalPass = new MODULES.POSTPROCESSING.MODULE.NormalPass(this.context.scene, cam);
        const depthDownsamplingPass = new MODULES.POSTPROCESSING.MODULE.DepthDownsamplingPass({
            normalBuffer: normalPass.texture,
            resolutionScale: .5
        });

        const ssao = this._ssao = new MODULES.POSTPROCESSING.MODULE.SSAOEffect(cam!, normalPass.texture, {
            normalDepthBuffer: depthDownsamplingPass.texture,
            worldDistanceThreshold: 1, // when it starts to fade out
            worldDistanceFalloff: 1, // smoothness of cutoff
            worldProximityThreshold: .1,
            worldProximityFalloff: 2,
            intensity: 1,
            blendFunction: MODULES.POSTPROCESSING.MODULE.BlendFunction.MULTIPLY,
            luminanceInfluence: .5,
        });

        this.intensity.onValueChanged = newValue => {
            ssao.intensity = newValue;
        }
        this.falloff.onValueChanged = newValue => {
            ssao.ssaoMaterial.radius = newValue * .1;
        }
        this.samples.onValueChanged = newValue => {
            ssao.ssaoMaterial.samples = newValue;
        }
        this.color.onValueChanged = newValue => {
            if (!ssao.color) ssao.color = new Color();
            ssao.color.copy(newValue);
        }
        this.luminanceInfluence.onValueChanged = newValue => {
            ssao.luminanceInfluence = newValue;
        }

        const arr = new Array();
        arr.push(normalPass);
        arr.push(depthDownsamplingPass);
        arr.push(ssao);
        return arr;
    }

}
registerCustomEffectType("ScreenSpaceAmbientOcclusion", ScreenSpaceAmbientOcclusion);
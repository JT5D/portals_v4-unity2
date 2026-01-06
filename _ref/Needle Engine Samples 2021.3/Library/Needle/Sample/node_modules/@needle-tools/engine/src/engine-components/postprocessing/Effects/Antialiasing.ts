import { MODULES } from "../../../engine/engine_modules.js";
import { serializable } from "../../../engine/engine_serialization.js";
import { getParam } from "../../../engine/engine_utils.js";
import { type EffectProviderResult, PostProcessingEffect } from "../PostProcessingEffect.js";
import { VolumeParameter } from "../VolumeParameter.js";
import { registerCustomEffectType } from "../VolumeProfile.js";


const debug = getParam("debugpost");


export enum QualityLevel {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2,
    ULTRA = 3
}

/**
 * @category Effects
 * @group Components
 */
export class Antialiasing extends PostProcessingEffect {
    get typeName(): string {
        return "Antialiasing";
    }

    // @serializable(VolumeParameter)
    // edgeDetectionThreshold!: VolumeParameter;

    @serializable(VolumeParameter)
    readonly preset: VolumeParameter = new VolumeParameter(2);
    // 2 is HIGH: https://github.com/pmndrs/postprocessing/blob/main/src/enums/SMAAPreset.js#L14


    onCreateEffect(): EffectProviderResult {
        const effect = new MODULES.POSTPROCESSING.MODULE.SMAAEffect({
            preset: this.preset?.value ?? MODULES.POSTPROCESSING.MODULE.SMAAPreset.HIGH,
            edgeDetectionMode: MODULES.POSTPROCESSING.MODULE.EdgeDetectionMode.LUMA,
            // Keep predication mode disabled (default) since it looks better
            // predicationMode: MODULES.POSTPROCESSING.MODULE.PredicationMode.DEPTH,
        });

        this.preset.onValueChanged = (newValue) => {
            if(debug) console.log("Antialiasing preset changed to", newValue);
            effect.applyPreset(newValue);
        };
        // setInterval(()=> {
        //     effect.applyPreset(Math.floor(Math.random()*3))
        // }, 1000)

        // effect.edgeDetectionMaterial.edgeDetectionThreshold = .01;

        // this.edgeDetectionThreshold.onValueChanged = (newValue) => {
        //     console.log(newValue);
        //     effect.edgeDetectionMaterial.edgeDetectionThreshold = newValue;
        // }

        return effect;
    }


}

registerCustomEffectType("Antialiasing", Antialiasing)
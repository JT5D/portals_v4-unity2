var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MODULES } from "../../../engine/engine_modules.js";
import { serializable } from "../../../engine/engine_serialization.js";
import { getParam } from "../../../engine/engine_utils.js";
import { PostProcessingEffect } from "../PostProcessingEffect.js";
import { VolumeParameter } from "../VolumeParameter.js";
import { registerCustomEffectType } from "../VolumeProfile.js";
const debug = getParam("debugpost");
export var QualityLevel;
(function (QualityLevel) {
    QualityLevel[QualityLevel["LOW"] = 0] = "LOW";
    QualityLevel[QualityLevel["MEDIUM"] = 1] = "MEDIUM";
    QualityLevel[QualityLevel["HIGH"] = 2] = "HIGH";
    QualityLevel[QualityLevel["ULTRA"] = 3] = "ULTRA";
})(QualityLevel || (QualityLevel = {}));
/**
 * @category Effects
 * @group Components
 */
export class Antialiasing extends PostProcessingEffect {
    get typeName() {
        return "Antialiasing";
    }
    // @serializable(VolumeParameter)
    // edgeDetectionThreshold!: VolumeParameter;
    preset = new VolumeParameter(2);
    // 2 is HIGH: https://github.com/pmndrs/postprocessing/blob/main/src/enums/SMAAPreset.js#L14
    onCreateEffect() {
        const effect = new MODULES.POSTPROCESSING.MODULE.SMAAEffect({
            preset: this.preset?.value ?? MODULES.POSTPROCESSING.MODULE.SMAAPreset.HIGH,
            edgeDetectionMode: MODULES.POSTPROCESSING.MODULE.EdgeDetectionMode.LUMA,
            // Keep predication mode disabled (default) since it looks better
            // predicationMode: MODULES.POSTPROCESSING.MODULE.PredicationMode.DEPTH,
        });
        this.preset.onValueChanged = (newValue) => {
            if (debug)
                console.log("Antialiasing preset changed to", newValue);
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
__decorate([
    serializable(VolumeParameter)
], Antialiasing.prototype, "preset", void 0);
registerCustomEffectType("Antialiasing", Antialiasing);
//# sourceMappingURL=Antialiasing.js.map
import { ACESFilmicToneMapping, AgXToneMapping, LinearToneMapping, NeutralToneMapping, ReinhardToneMapping } from "three";
import { MODULES } from "../../../engine/engine_modules.js";
export var NEToneMappingMode;
(function (NEToneMappingMode) {
    NEToneMappingMode[NEToneMappingMode["None"] = 0] = "None";
    NEToneMappingMode[NEToneMappingMode["Neutral"] = 1] = "Neutral";
    NEToneMappingMode[NEToneMappingMode["ACES"] = 2] = "ACES";
    NEToneMappingMode[NEToneMappingMode["AgX"] = 3] = "AgX";
    NEToneMappingMode[NEToneMappingMode["KhronosNeutral"] = 4] = "KhronosNeutral";
})(NEToneMappingMode || (NEToneMappingMode = {}));
const unknownTonemappingWarning = new Map();
export function toThreeToneMapping(mode) {
    switch (mode) {
        case NEToneMappingMode.None:
            return LinearToneMapping;
        case NEToneMappingMode.Neutral:
            return ReinhardToneMapping;
        case NEToneMappingMode.ACES:
            return ACESFilmicToneMapping;
        case NEToneMappingMode.AgX:
            return AgXToneMapping;
        case NEToneMappingMode.KhronosNeutral:
            return NeutralToneMapping;
        default:
            if (!unknownTonemappingWarning.has(mode)) {
                unknownTonemappingWarning.set(mode, true);
                console.warn("[Postprocessing] Unknown tone mapping mode", mode);
            }
            return NeutralToneMapping;
    }
}
export function threeToNeedleToneMapping(mode) {
    switch (mode) {
        case LinearToneMapping: return NEToneMappingMode.None;
        case ACESFilmicToneMapping: return NEToneMappingMode.ACES;
        case AgXToneMapping: return NEToneMappingMode.AgX;
        case NeutralToneMapping: return NEToneMappingMode.Neutral;
        case ReinhardToneMapping: return NEToneMappingMode.Neutral;
        default: return NEToneMappingMode.None;
    }
}
export function threeToneMappingToEffectMode(mode) {
    switch (mode) {
        case LinearToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.LINEAR;
        case ACESFilmicToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.ACES_FILMIC;
        case AgXToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.AGX;
        case NeutralToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.NEUTRAL;
        case ReinhardToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.REINHARD;
        default: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.LINEAR;
    }
}
//# sourceMappingURL=Tonemapping.utils.js.map
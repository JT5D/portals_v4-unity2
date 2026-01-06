import type { ToneMappingMode } from "postprocessing";
import { ACESFilmicToneMapping, AgXToneMapping, LinearToneMapping, NeutralToneMapping, ReinhardToneMapping, ToneMapping } from "three";

import { MODULES } from "../../../engine/engine_modules.js";

export enum NEToneMappingMode {
    None = 0,
    Neutral = 1,            // Neutral tonemapper, close to Reinhard
    ACES = 2,               // ACES Filmic reference tonemapper (custom approximation)
    AgX = 3,                // AgX Filmic tonemapper
    KhronosNeutral = 4,     // PBR Neural tonemapper
}
export type NEToneMappingModeNames = keyof typeof NEToneMappingMode;

const unknownTonemappingWarning = new Map<any, boolean>();

export function toThreeToneMapping(mode: NEToneMappingMode | undefined) {
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
            if(!unknownTonemappingWarning.has(mode)) {
                unknownTonemappingWarning.set(mode, true);
                console.warn("[Postprocessing] Unknown tone mapping mode", mode);
            }
            return NeutralToneMapping;
    }
}

export function threeToNeedleToneMapping(mode: ToneMapping | number | undefined): NEToneMappingMode {
    switch (mode) {
        case LinearToneMapping: return NEToneMappingMode.None;
        case ACESFilmicToneMapping: return NEToneMappingMode.ACES;
        case AgXToneMapping: return NEToneMappingMode.AgX;
        case NeutralToneMapping: return NEToneMappingMode.Neutral;
        case ReinhardToneMapping: return NEToneMappingMode.Neutral;
        default: return NEToneMappingMode.None;
    }

}


export function threeToneMappingToEffectMode(mode: number | undefined): ToneMappingMode {
    switch (mode) {
        case LinearToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.LINEAR;
        case ACESFilmicToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.ACES_FILMIC;
        case AgXToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.AGX;
        case NeutralToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.NEUTRAL;
        case ReinhardToneMapping: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.REINHARD;
        default: return MODULES.POSTPROCESSING.MODULE.ToneMappingMode.LINEAR;
    }
}

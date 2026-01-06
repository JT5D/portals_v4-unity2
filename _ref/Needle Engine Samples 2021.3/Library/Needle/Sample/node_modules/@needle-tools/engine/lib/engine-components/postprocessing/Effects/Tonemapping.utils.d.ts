import type { ToneMappingMode } from "postprocessing";
import { ToneMapping } from "three";
export declare enum NEToneMappingMode {
    None = 0,
    Neutral = 1,
    ACES = 2,
    AgX = 3,
    KhronosNeutral = 4
}
export type NEToneMappingModeNames = keyof typeof NEToneMappingMode;
export declare function toThreeToneMapping(mode: NEToneMappingMode | undefined): 1 | 2 | 4 | 6 | 7;
export declare function threeToNeedleToneMapping(mode: ToneMapping | number | undefined): NEToneMappingMode;
export declare function threeToneMappingToEffectMode(mode: number | undefined): ToneMappingMode;

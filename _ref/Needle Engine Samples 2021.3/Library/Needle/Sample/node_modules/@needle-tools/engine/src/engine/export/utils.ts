import { Object3D } from "three";

import { HideFlags } from "../engine_types.js";


export function shouldExport_HideFlags(obj: Object3D) {
    const dontExport = HideFlags.DontExport;
    if (obj.hideFlags & dontExport) return false;
    return true;
}
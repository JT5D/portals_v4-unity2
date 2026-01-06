import { Vector3 } from "three";

import { slerp } from "../../engine/engine_three_utils.js";
import { applyPrototypeExtensions, registerPrototypeExtensions } from "./ExtensionUtils.js";

/** @internal */
export function apply(object: Vector3) {
    if (object && object.isVector3 === true) {
        applyPrototypeExtensions(object, Vector3);
    }
}

// NOTE: keep in sync with method declarations below
declare module 'three' {
    export interface Vector3 {
        slerp(end: Vector3, t: number): Vector3;
    }
}

Vector3.prototype["slerp"] = function (end: Vector3, t: number) {
    return slerp(this, end, t);
}

registerPrototypeExtensions(Vector3);

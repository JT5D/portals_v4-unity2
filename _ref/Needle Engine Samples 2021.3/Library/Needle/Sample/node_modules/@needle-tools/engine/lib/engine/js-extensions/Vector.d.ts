import { Vector3 } from "three";
/** @internal */
export declare function apply(object: Vector3): void;
declare module 'three' {
    interface Vector3 {
        slerp(end: Vector3, t: number): Vector3;
    }
}

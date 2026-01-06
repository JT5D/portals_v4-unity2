import { Vector3 } from "three";

import { Mathf } from "../../engine/engine_math.js";
import { SplineContainer, SplineData } from "./Spline.js";

/**
 * @category Splines
 */
export namespace SplineUtils {

    /**
     * Creates a SplineContainer from an array of points.
     * @param positions The positions of the knots.
     * @param closed Whether the spline is closed (the last knot connects to the first).
     * @param tension The tension of the spline. 0 is no tension, 1 is high tension (straight lines between knots). Default is 0.75.
     * @return The created SplineContainer component - add it to an Object3D to use it.
     */
    export function createFromPoints(positions: Vector3[], closed: boolean = false, tension: number = .75): SplineContainer {
        const spline = new SplineContainer();
        const tangentFactor = 1 - Mathf.clamp(tension, 0, 1);
        positions.forEach((pos, index) => {
            const tangent = new Vector3();
            if (index < positions.length - 1) tangent.subVectors(positions[index + 1], pos).normalize().multiplyScalar(tangentFactor);
            else if (closed && positions.length > 1) tangent.subVectors(positions[0], pos).normalize().multiplyScalar(tangentFactor);
            const knot = new SplineData();
            knot.position.copy(pos);
            knot.tangentIn.copy(tangent);
            knot.tangentOut.copy(tangent);
            spline.addKnot(knot);
        });
        spline.closed = closed;
        return spline;
    }
}
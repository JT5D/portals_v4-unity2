import { Vector3 } from "three";
import { SplineContainer } from "./Spline.js";
/**
 * @category Splines
 */
export declare namespace SplineUtils {
    /**
     * Creates a SplineContainer from an array of points.
     * @param positions The positions of the knots.
     * @param closed Whether the spline is closed (the last knot connects to the first).
     * @param tension The tension of the spline. 0 is no tension, 1 is high tension (straight lines between knots). Default is 0.75.
     * @return The created SplineContainer component - add it to an Object3D to use it.
     */
    function createFromPoints(positions: Vector3[], closed?: boolean, tension?: number): SplineContainer;
}

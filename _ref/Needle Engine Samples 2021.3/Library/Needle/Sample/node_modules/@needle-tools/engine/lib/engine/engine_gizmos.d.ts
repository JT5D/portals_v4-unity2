import { Box3, BufferGeometry, Color, type ColorRepresentation, LineSegments, Matrix4, Mesh, Object3D, Quaternion } from 'three';
import type { Vec3, Vec4 } from './engine_types.js';
import { RGBAColor } from './js-extensions/RGBAColor.js';
export type LabelHandle = {
    setText(str: string): any;
};
type GizmoColor = ColorRepresentation | (Color & {
    a: number;
}) | RGBAColor;
/** Gizmos are temporary objects that are drawn in the scene for debugging or visualization purposes
 * They are automatically removed after a given duration and cached internally to reduce overhead.
 * Use the static methods of this class to draw gizmos in the scene.
 */
export declare class Gizmos {
    private constructor();
    /**
     * Allow creating gizmos
     * If disabled then no gizmos will be added to the scene anymore
     */
    static enabled: boolean;
    /**
     * Returns true if a given object is a gizmo
     */
    static isGizmo(obj: Object3D): boolean;
    /** Set visibility of all currently rendered gizmos */
    static setVisible(visible: boolean): void;
    /**
     * Draw a label in the scene or attached to an object (if a parent is provided)
     * @param position the position of the label in world space
     * @param text the text of the label
     * @param size the size of the label in world space
     * @param duration the duration in seconds the label will be rendered. If 0 it will be rendered for one frame
     * @param color the color of the label
     * @param backgroundColor the background color of the label
     * @param parent the parent object to attach the label to. If no parent is provided the label will be attached to the scene
     * @returns a handle to the label that can be used to update the text
     */
    static DrawLabel(position: Vec3, text: string, size?: number, duration?: number, color?: ColorRepresentation, backgroundColor?: ColorRepresentation | GizmoColor, parent?: Object3D): LabelHandle | null;
    /**
     * Draw a ray gizmo in the scene
     * @param origin the origin of the ray in world space
     * @param dir the direction of the ray in world space
     * @param color the color of the ray
     * @param duration the duration in seconds the ray will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the ray will be rendered with depth test
     */
    static DrawRay(origin: Vec3, dir: Vec3, color?: GizmoColor, duration?: number, depthTest?: boolean): void;
    /**
     * Draw a line gizmo in the scene
     * @param pt0 the start point of the line in world space
     * @param pt1 the end point of the line in world space
     * @param color the color of the line
     * @param duration the duration in seconds the line will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the line will be rendered with depth test
     * @param lengthFactor the length of the line. Default is 1
     */
    static DrawDirection(pt: Vec3, direction: Vec3 | Vec4, color?: GizmoColor, duration?: number, depthTest?: boolean, lengthFactor?: number): void;
    /**
     * Draw a line gizmo in the scene
     * @param pt0 the start point of the line in world space
     * @param pt1 the end point of the line in world space
     * @param color the color of the line
     * @param duration the duration in seconds the line will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the line will be rendered with depth test
     */
    static DrawLine(pt0: Vec3, pt1: Vec3, color?: GizmoColor, duration?: number, depthTest?: boolean): void;
    /**
     * Draw a 2D circle gizmo in the scene
     * @param pt0 the center of the circle in world space
     * @param normal the normal of the circle in world space
     * @param radius the radius of the circle in world space
     * @param color the color of the circle
     * @param duration the duration in seconds the circle will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the circle will be rendered with depth test
     */
    static DrawCircle(pt0: Vec3, normal: Vec3, radius: number, color?: ColorRepresentation, duration?: number, depthTest?: boolean): void;
    /**
     * Draw a 3D wiremesh sphere gizmo in the scene
     * @param center the center of the sphere in world space
     * @param radius the radius of the sphere in world space
     * @param color the color of the sphere
     * @param duration the duration in seconds the sphere will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the sphere will be rendered with depth test
     */
    static DrawWireSphere(center: Vec3, radius: number, color?: GizmoColor, duration?: number, depthTest?: boolean): void;
    /**
     * Draw a 3D sphere gizmo in the scene
     * @param center the center of the sphere in world space
     * @param radius the radius of the sphere in world space
     * @param color the color of the sphere
     * @param duration the duration in seconds the sphere will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the sphere will be rendered with depth test
     */
    static DrawSphere(center: Vec3, radius: number, color?: GizmoColor, duration?: number, depthTest?: boolean): void;
    /**
     * Draw a 3D wiremesh box gizmo in the scene
     * @param center the center of the box in world space
     * @param size the size of the box in world space
     * @param rotation the rotation of the box in world space
     * @param color the color of the box
     * @param duration the duration in seconds the box will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the box will be rendered with depth test
     */
    static DrawWireBox(center: Vec3, size: Vec3, color?: GizmoColor, duration?: number, depthTest?: boolean, rotation?: Quaternion | undefined): void;
    /**
     * Draw a 3D wiremesh box gizmo in the scene
     * @param box the box in world space
     * @param color the color of the box
     * @param duration the duration in seconds the box will be rendered. If 0 it will be rendered for one frame. Default: 0
     * @param depthTest if true the box will be rendered with depth test. Default: true
     */
    static DrawWireBox3(box: Box3, color?: GizmoColor, duration?: number, depthTest?: boolean): void;
    private static _up;
    /**
     * Draw an arrow gizmo in the scene
     * @param pt0 the start point of the arrow in world space
     * @param pt1 the end point of the arrow in world space
     * @param color the color of the arrow
     * @param duration the duration in seconds the arrow will be rendered. If 0 it will be rendered for one frame
     * @param depthTest if true the arrow will be rendered with depth test
     * @param wireframe if true the arrow will be rendered as wireframe
     */
    static DrawArrow(pt0: Vec3, pt1: Vec3, color?: ColorRepresentation, duration?: number, depthTest?: boolean, wireframe?: boolean): void;
    /**
     * Render a wireframe mesh in the scene. The mesh will be removed after the given duration (if duration is 0 it will be rendered for one frame).
     * If a mesh object is provided then the mesh's matrixWorld and geometry will be used. Otherwise, the provided matrix and geometry will be used.
     * @param options the options for the wire mesh
     * @param options.duration the duration in seconds the mesh will be rendered. If 0 it will be rendered for one frame
     * @param options.color the color of the wire mesh
     * @param options.depthTest if true the wire mesh will be rendered with depth test
     * @param options.mesh the mesh object to render (if it is provided the matrix and geometry will be used)
     * @param options.matrix the matrix of the mesh to render
     * @param options.geometry the geometry of the mesh to render
     * @example
     * ```typescript
     * Gizmos.DrawWireMesh({ duration: 1, color: 0xff0000, mesh: myMesh });
     * ```
     */
    static DrawWireMesh(options: {
        duration?: number;
        color?: ColorRepresentation;
        depthTest?: boolean;
    } & ({
        mesh: Mesh;
    } | {
        matrix: Matrix4;
        geometry: BufferGeometry;
    })): void;
}
export declare function CreateWireCube(col?: ColorRepresentation | null): LineSegments;
export {};

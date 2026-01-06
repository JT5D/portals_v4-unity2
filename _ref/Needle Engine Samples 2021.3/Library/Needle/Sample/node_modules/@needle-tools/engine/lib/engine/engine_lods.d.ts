import type { LOD_Results } from "@needle-tools/gltf-progressive";
import { LODsManager as _LODsManager, NEEDLE_progressive_plugin } from "@needle-tools/gltf-progressive";
import { Camera, Mesh, Scene, WebGLRenderer } from "three";
import type { Context } from "./engine_context.js";
/**
 * Needle Engine LODs manager. Wrapper around the internal LODs manager.
 * It uses the @needle-tools/gltf-progressive package to manage LODs.
 * @link https://npmjs.com/package/@needle-tools/gltf-progressive
 */
export declare class LODsManager implements NEEDLE_progressive_plugin {
    /** The type of the @needle-tools/gltf-progressive LODsManager - can be used to set static settings */
    static readonly GLTF_PROGRESSIVE_LODSMANAGER_TYPE: typeof _LODsManager;
    readonly context: Context;
    private _lodsManager?;
    private _settings;
    /**
     * The internal LODs manager. See @needle-tools/gltf-progressive for more information.
     * @link https://npmjs.com/package/@needle-tools/gltf-progressive
     */
    get manager(): _LODsManager | undefined;
    get skinnedMeshAutoUpdateBoundsInterval(): number;
    set skinnedMeshAutoUpdateBoundsInterval(value: number);
    /**
     * The target triangle density is the desired max amount of triangles on screen when the mesh is filling the screen.
     * @default 200_000
     */
    get targetTriangleDensity(): number;
    set targetTriangleDensity(value: number);
    constructor(context: Context);
    private applySettings;
    /** @internal */
    setRenderer(renderer: WebGLRenderer): void;
    disable(): void;
    /** @internal */
    onAfterUpdatedLOD(_renderer: WebGLRenderer, _scene: Scene, camera: Camera, mesh: Mesh, level: LOD_Results): void;
    private onRenderDebug;
}

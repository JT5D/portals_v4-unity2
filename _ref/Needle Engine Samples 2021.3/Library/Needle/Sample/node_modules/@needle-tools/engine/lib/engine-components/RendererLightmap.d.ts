import { Material, Texture, Vector4 } from "three";
import { type Renderer } from "./Renderer.js";
/**
 * This component is automatically added by the {@link Renderer} component if the object has lightmap uvs AND we have a lightmap.
 *
 * @category Rendering
 * @group Components
 */
export declare class RendererLightmap {
    get lightmap(): Texture | null;
    set lightmap(tex: Texture | null);
    private lightmapIndex;
    private lightmapScaleOffset;
    private readonly renderer;
    private readonly clonedMaterials;
    private get context();
    private get gameObject();
    private lightmapTexture;
    private lightmapScaleOffsetUniform;
    private lightmapUniform;
    constructor(renderer: Renderer);
    init(lightmapIndex: number, lightmapScaleOffset: Vector4, lightmapTexture: Texture): void;
    updateLightmapUniforms(material: Material): void;
    /**
     * Apply the lightmap to the object. This will clone the material and set the lightmap texture and scale/offset
     */
    applyLightmap(): void;
    private ensureLightmapUvs;
    private ensureLightmapMaterial;
    private assignLightmapTexture;
    private onBeforeCompile;
    private setLightmapDebugMaterial;
}

import { NEEDLE_progressive } from "@needle-tools/gltf-progressive";
import { Group, Material, Mesh, MeshPhysicalMaterial, Object3D, ShaderMaterial, Texture, Vector4, WebGLProgramParametersWithUniforms } from "three";

import type { Context } from "../engine/engine_setup.js";
import { getParam } from "../engine/engine_utils.js";
import { type Renderer } from "./Renderer.js";

const debug = getParam("debuglightmaps");

declare type MaterialWithLightmap = Material & { lightMap?: Texture | null };

let cloningCounter = 0;

const $lightmapVersion = Symbol("lightmap-material-version");


/**
 * This component is automatically added by the {@link Renderer} component if the object has lightmap uvs AND we have a lightmap.
 * 
 * @category Rendering
 * @group Components
 */
export class RendererLightmap {

    get lightmap(): Texture | null {
        return this.lightmapTexture;
    }
    set lightmap(tex: Texture | null) {
        if (tex !== this.lightmapTexture) {
            this.lightmapTexture = tex;
            this.applyLightmap();
            if (this.lightmapTexture) {
                NEEDLE_progressive.assignTextureLOD(this.lightmapTexture, 0).then(res => {
                    if ((res as Texture)?.isTexture) this.lightmapTexture = res as Texture;
                })
            }
        }
    }

    private lightmapIndex: number = -1;
    private lightmapScaleOffset: Vector4 = new Vector4(1, 1, 0, 0);

    private readonly renderer: Renderer;
    private readonly clonedMaterials = new Array<Material>();

    private get context(): Context { return this.renderer.context; }
    private get gameObject() { return this.renderer.gameObject; }
    private lightmapTexture: Texture | null = null;
    private lightmapScaleOffsetUniform = { value: new Vector4(1, 1, 0, 0) };
    private lightmapUniform: { value: Texture | null } = { value: null };

    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    init(lightmapIndex: number, lightmapScaleOffset: Vector4, lightmapTexture: Texture) {
        console.assert(this.gameObject !== undefined && this.gameObject !== null, "Missing gameobject", this);
        this.lightmapIndex = lightmapIndex;
        if (this.lightmapIndex < 0) return;
        this.lightmapScaleOffset = lightmapScaleOffset;
        this.lightmapTexture = lightmapTexture;
        NEEDLE_progressive.assignTextureLOD(lightmapTexture, 0).then(res => {
            if ((res as Texture)?.isTexture) this.lightmapTexture = res as Texture;
        })
        if (debug == "show") {
            console.log("Lightmap:", this.gameObject.name, lightmapIndex, "\nScaleOffset:", lightmapScaleOffset, "\nTexture:", lightmapTexture)
            this.setLightmapDebugMaterial();
        }
        else if (debug) console.log("Use debuglightmaps=show to render lightmaps only in the scene.")
        this.applyLightmap();
    }

    updateLightmapUniforms(material: Material) {
        const uniforms = material["uniforms"];
        if (uniforms && uniforms.lightmap) {
            this.lightmapScaleOffsetUniform.value = this.lightmapScaleOffset;
            uniforms.lightmapScaleOffset = this.lightmapScaleOffsetUniform;
        }
    }

    /**
     * Apply the lightmap to the object. This will clone the material and set the lightmap texture and scale/offset
     */
    applyLightmap() {
        if (this.gameObject.type === "Object3D") {
            if (debug)
                console.warn("Can not add lightmap. Is this object missing a renderer?", this.gameObject.name);
            return;
        }

        const mesh = this.gameObject as unknown as (Mesh | Group);
        this.ensureLightmapUvs(mesh);

        for (let i = 0; i < this.renderer.sharedMaterials.length; i++) {

            const mat = this.renderer.sharedMaterials[i];
            if (!mat) continue;
            const newMat = this.ensureLightmapMaterial(mat, i);
            if (mat !== newMat) {
                this.renderer.sharedMaterials[i] = newMat;
            }
        }

        if (this.lightmapIndex >= 0 && this.lightmapTexture) {
            // always on channel 1 for now. We could optimize this by passing the correct lightmap index along
            this.lightmapTexture.channel = 1;
            for (const mat of this.renderer.sharedMaterials) {
                if (mat) this.assignLightmapTexture(mat);
            }
        }
    }

    private ensureLightmapUvs(object: Object3D | Group | Mesh) {
        if (object instanceof Mesh) {
            if (!object.geometry.getAttribute("uv1")) {
                object.geometry.setAttribute("uv1", object.geometry.getAttribute("uv"));
            }
        }
        else if (object instanceof Group) {
            for (const child of object.children) {
                this.ensureLightmapUvs(child);
            }
        }
    }

    private ensureLightmapMaterial(material: Material, index: number) {
        if (!material.userData) material.userData = {};
        // if (material instanceof MeshPhysicalMaterial) {
        //     return material;
        // }
        // check if the material version has changed and only then clone the material
        if (this.clonedMaterials[index] !== material) {
            if (debug) {
                ++cloningCounter;
                if (cloningCounter++ < 1000) {
                    console.warn(`Cloning material for lightmap ${this.renderer.name}: '${material.name}'`);
                }
                else if (cloningCounter === 1000) {
                    console.warn(`Further material cloning for lightmaps suppressed to avoid flooding the console.`);
                }
            }
            const mat: Material = material.clone();
            if (!mat.name?.includes("(lightmap)")) mat.name = material.name + " (lightmap)";
            material = mat;
            material.onBeforeCompile = this.onBeforeCompile;
            this.clonedMaterials[index] = material;

        }
        return material;
    }

    private assignLightmapTexture(material: MaterialWithLightmap) {
        if (!material) return;
        if (material instanceof MeshPhysicalMaterial && material.transmission > 0) {
            return;
        }
        const hasChanged = material.lightMap !== this.lightmapTexture || material[$lightmapVersion] !== material.version;
        if (!hasChanged) {
            return;
        }

        if (debug) console.log(`Assigning lightmap texture ${this.renderer.name}: '${material.name}' (${material.version} ${material[$lightmapVersion]})`);

        // assign the lightmap
        material.lightMap = this.lightmapTexture;
        material.needsUpdate = true;
        // store the version of the material
        material[$lightmapVersion] = material.version;
    }

    private onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, _) => {
        if (debug === "verbose") console.log("Lightmaps, before compile\n", shader)
        this.lightmapScaleOffsetUniform.value = this.lightmapScaleOffset;
        this.lightmapUniform.value = this.lightmapTexture;
        shader.uniforms.lightmapScaleOffset = this.lightmapScaleOffsetUniform;
    }

    private setLightmapDebugMaterial() {

        // debug lightmaps
        this.gameObject["material"] = new ShaderMaterial({
            vertexShader: `
                varying vec2 vUv1;
                void main()
                {
                    vUv1 = uv1;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
                `,
            fragmentShader: `
                uniform sampler2D lightMap;
                uniform float lightMapIntensity;
                uniform vec4 lightmapScaleOffset;
                varying vec2 vUv1;

                // took from threejs 05fc79cd52b79e8c3e8dec1e7dca72c5c39983a4
                vec4 conv_sRGBToLinear( in vec4 value ) {
                    return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
                }

                void main() {
                    vec2 lUv = vUv1.xy * lightmapScaleOffset.xy + vec2(lightmapScaleOffset.z, (1. - (lightmapScaleOffset.y + lightmapScaleOffset.w)));
                    
                    vec4 lightMapTexel = texture2D( lightMap, lUv);
                    gl_FragColor = lightMapTexel;
                    gl_FragColor.a = 1.;
                }
                `,
            defines: { USE_LIGHTMAP: '' }
        });
    }
}
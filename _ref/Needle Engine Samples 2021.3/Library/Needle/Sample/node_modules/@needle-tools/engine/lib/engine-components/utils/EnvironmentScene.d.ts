import { MeshBasicMaterial, Scene } from 'three';
export declare class EnvironmentScene extends Scene {
    constructor(name: 'legacy' | 'neutral');
    createAreaLightMaterial(intensity: number): MeshBasicMaterial;
}

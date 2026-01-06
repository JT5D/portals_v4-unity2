import { GLTFLoaderPlugin } from "three/examples/jsm/loaders/GLTFLoader.js";

export type AnimationPointerResolver = {
    resolvePath(path: string): string | null;
}

export declare class GLTFAnimationPointerExtension implements GLTFLoaderPlugin {
    name: string;
    parser: any;
    constructor(parser: any);
    setAnimationPointerResolver(resolver: AnimationPointerResolver | null): GLTFAnimationPointerExtension;
    loadAnimation(animationIndex: number): Promise<any>;
}
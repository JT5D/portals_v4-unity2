import { Texture, WebGLRenderer } from "three";
/**
 * Assigns the camera feed to a texture - this must be called during the render loop
 */
export declare function updateTextureFromXRFrame(renderer: WebGLRenderer, target: Texture): boolean;

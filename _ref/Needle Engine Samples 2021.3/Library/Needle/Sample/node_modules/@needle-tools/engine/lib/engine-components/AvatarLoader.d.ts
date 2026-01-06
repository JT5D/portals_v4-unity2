import { Object3D } from "three";
import { Context } from "../engine/engine_setup.js";
/**
 * Represents an avatar model with head and hands references.
 * Used for representing characters in 3D space.
 */
export declare class AvatarModel {
    /** The root object of the avatar model */
    root: Object3D;
    /** The head object of the avatar model */
    head: Object3D;
    /** The left hand object of the avatar model, if available */
    leftHand: Object3D | null;
    /** The right hand object of the avatar model, if available */
    rigthHand: Object3D | null;
    /**
     * Checks if the avatar model has a valid configuration.
     * An avatar is considered valid if it has a head.
     * @returns Whether the avatar has a valid setup
     */
    get isValid(): boolean;
    /**
     * Creates a new avatar model.
     * @param root The root object of the avatar
     * @param head The head object of the avatar
     * @param leftHand The left hand object of the avatar
     * @param rigthHand The right hand object of the avatar
     */
    constructor(root: Object3D, head: Object3D, leftHand: Object3D | null, rigthHand: Object3D | null);
}
/**
 * Handles loading and instantiating avatar models from various sources.
 * Provides functionality to find and extract important parts of an avatar (head, hands).
 *
 * Debug mode can be enabled with the URL parameter `?debugavatar`,
 * which will log detailed information about avatar loading and configuration.
 */
export declare class AvatarLoader {
    private readonly avatarRegistryUrl;
    /**
     * Retrieves or creates a new avatar instance from an ID or existing Object3D.
     * @param context The application context
     * @param avatarId Either a string ID to load an avatar or an existing Object3D to use as avatar
     * @returns Promise resolving to an AvatarModel if successful, or null if failed
     */
    getOrCreateNewAvatarInstance(context: Context, avatarId: string | Object3D): Promise<AvatarModel | null>;
    /**
     * Loads an avatar model from a file or registry using the provided ID.
     * @param context The engine context
     * @param avatarId The ID of the avatar to load
     * @returns Promise resolving to the loaded avatar's Object3D, or null if failed
     */
    private loadAvatar;
    /**
     * Caches an avatar model for reuse.
     * @param _id The ID to associate with the model
     * @param _model The avatar model to cache
     */
    private cacheModel;
    /**
     * Analyzes an Object3D to find avatar parts (head, hands) based on naming conventions.
     * @param obj The Object3D to search for avatar parts
     * @returns A structured AvatarModel with references to found parts
     */
    private findAvatar;
    /**
     * Recursively searches for an avatar part by name within an Object3D hierarchy.
     * @param obj The Object3D to search within
     * @param searchString Array of strings that should all be present in the object name
     * @returns The found Object3D part or null if not found
     */
    private findAvatarPart;
    /**
     * Handles HTTP response errors from avatar loading operations.
     * @param response The fetch API response to check
     * @returns The response if it was ok
     * @throws Error with status text if response was not ok
     */
    private handleCustomAvatarErrors;
}

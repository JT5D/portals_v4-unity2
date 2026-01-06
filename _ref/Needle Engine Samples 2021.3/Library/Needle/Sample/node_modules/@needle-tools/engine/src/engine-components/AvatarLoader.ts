import { Box3, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { InstantiateOptions } from "../engine/engine_gameobject.js";
import { getLoader } from "../engine/engine_gltf.js";
import * as loaders from "../engine/engine_loaders.gltf.js"
import { Context } from "../engine/engine_setup.js";
import * as utils from "../engine/engine_utils.js"
import { GameObject } from "./Component.js";

const debug = utils.getParam("debugavatar");

/**
 * Represents an avatar model with head and hands references.
 * Used for representing characters in 3D space.
 */
export class AvatarModel {
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
    get isValid(): boolean {
        return this.head !== null && this.head !== undefined;
    }

    /**
     * Creates a new avatar model.
     * @param root The root object of the avatar
     * @param head The head object of the avatar
     * @param leftHand The left hand object of the avatar
     * @param rigthHand The right hand object of the avatar
     */
    constructor(root: Object3D, head: Object3D, leftHand: Object3D | null, rigthHand: Object3D | null) {
        this.root = root;
        this.head = head;
        this.leftHand = leftHand;
        this.rigthHand = rigthHand;
        this.root?.traverse(h => h.layers.set(2));
        // this.head?.traverse(h => h.layers.set(2));
        // this.leftHand?.traverse(h => h.layers.set(2));
        // this.rigthHand?.traverse(h => h.layers.set(2));
    }
}

/**
 * Handles loading and instantiating avatar models from various sources.
 * Provides functionality to find and extract important parts of an avatar (head, hands).
 * 
 * Debug mode can be enabled with the URL parameter `?debugavatar`,
 * which will log detailed information about avatar loading and configuration.
 */
export class AvatarLoader {

    private readonly avatarRegistryUrl: string | null = null;
    // private loader: GLTFLoader | null;
    // private avatarModelCache: Map<string, AvatarModel | null> = new Map<string, AvatarModel | null>();

    /**
     * Retrieves or creates a new avatar instance from an ID or existing Object3D.
     * @param context The application context
     * @param avatarId Either a string ID to load an avatar or an existing Object3D to use as avatar
     * @returns Promise resolving to an AvatarModel if successful, or null if failed
     */
    public async getOrCreateNewAvatarInstance(context: Context, avatarId: string | Object3D): Promise<AvatarModel | null> {

        if (!avatarId) {
            console.error("Can not create avatar: failed to provide id or root object");
            return null;
        }

        let root: Object3D | null = null;
        if (typeof avatarId === "string") {
            root = await this.loadAvatar(context, avatarId);
            if (!root) {
                const opts = new InstantiateOptions();
                // opts.parent = context.scene.uuid;
                root = GameObject.instantiate(utils.tryFindObject(avatarId, context.scene) as Object3D, opts);
            }
        }
        else root = avatarId;

        if (!root) {
            return null;
        }
        const model = this.findAvatar(root);
        // model.assignRandomColors();
        // this.cacheModel(avatarId, model);

        if (model.isValid) {
            if (debug)
                console.log("[Custom Avatar] valid config", avatarId, debug ? model : "");
            return model;
        }
        else {
            console.warn("[Custom Avatar] config isn't valid", avatarId, debug ? model : "");
            return null;
        }
    }


    /**
     * Loads an avatar model from a file or registry using the provided ID.
     * @param context The engine context
     * @param avatarId The ID of the avatar to load
     * @returns Promise resolving to the loaded avatar's Object3D, or null if failed
     */
    private async loadAvatar(context: Context, avatarId: string): Promise<Object3D | null> {

        console.assert(avatarId !== undefined && avatarId !== null && typeof avatarId === "string", "Avatar id must not be null");
        if (avatarId.length <= 0) return null;
        if (!avatarId) return null;

        if (debug)
            console.log("[Custom Avatar] " + avatarId + ", loading...");
        // should probably be done by the server?!
        if (!avatarId.endsWith(".glb"))
            avatarId += ".glb";


        // for the demo we use the storage backend we uploaded the avatar to (by file drop)
        if (this.avatarRegistryUrl === null) {
            // try loading avatar from local file
            const download_res = await fetch("./" + avatarId);
            let bin: ArrayBuffer | null = null;
            if (download_res.ok) {
                const blob = await download_res.blob();
                if (blob) bin = await blob.arrayBuffer();
            }
            if (!bin) {
                // bin = await BlobStorage.download(avatarId, avatarId, 0, "no url here go away", true);
                return null;
            }

            const gltf = await getLoader().parseSync(context, bin, null!, 0);
            return gltf?.scene ?? null;
        }


        // if (this.avatarModelCache.has(avatarId)) {
        //     console.log("[Custom Avatar] " + avatarId + ", found in cache");
        //     return new Promise((res, _) => {
        //         var model = this.avatarModelCache.get(avatarId)?.createNewInstance();
        //         res(model);
        //     });
        // }
        // return null;

        const loader = new GLTFLoader();
        loaders.addDracoAndKTX2Loaders(loader, context);

        // TODO: cache binary (fetch finary from model gallery and use binary method)
        return new Promise((resolve, _reject) => {
            const url = this.avatarRegistryUrl + "/" + avatarId;
            loader.load(url,
                async gltf => {
                    await getLoader().createBuiltinComponents(context, url, gltf, null, undefined);
                    resolve(gltf.scene);
                },
                progress => {
                    if (debug)
                        console.log("[Custom Avatar] " + (progress.loaded / progress.total * 100) + '% loaded of ' + (progress.total / 1024) + "kB");
                },
                error => {
                    console.error("[Custom Avatar] " + "Error when loading: " + error);
                    resolve(null);
                }
            );
        });
    }

    /**
     * Caches an avatar model for reuse.
     * @param _id The ID to associate with the model
     * @param _model The avatar model to cache
     */
    private cacheModel(_id: string, _model: AvatarModel) {
        // this.avatarModelCache.set(id, model);
    }

    /**
     * Analyzes an Object3D to find avatar parts (head, hands) based on naming conventions.
     * @param obj The Object3D to search for avatar parts
     * @returns A structured AvatarModel with references to found parts
     */
    private findAvatar(obj: Object3D): AvatarModel {

        const root: Object3D = obj;
        let searchIn = root;
        // some GLTFs have a "scene" root it seems, others don't, we skip the root here if there's only one child
        if (searchIn.children.length == 1)
            searchIn = obj.children[0];
        let head = this.findAvatarPart(searchIn, ["head"]);

        const leftHand = this.findAvatarPart(searchIn, ["left", "hand"]);
        const rightHand = this.findAvatarPart(searchIn, ["right", "hand"]);

        if (!head) {
            // very last fallback, entire root is used as head
            head = root;

            // normalize size, if the object isn't properly setup the scale might be totally off
            const boundsSize = new Vector3();
            new Box3().setFromObject(head).getSize(boundsSize);
            const maxAxis = Math.max(boundsSize.x, boundsSize.y, boundsSize.z);
            console.warn("[Custom Avatar] " + "Normalizing head scale, it's too big: " + maxAxis + " meters! Should be < 0.3m");
            if (maxAxis > 0.3) {
                head.scale.multiplyScalar(1.0 / maxAxis * 0.3);
            }
        }

        const model = new AvatarModel(root, head, leftHand, rightHand);
        return model;
    }

    /**
     * Recursively searches for an avatar part by name within an Object3D hierarchy.
     * @param obj The Object3D to search within
     * @param searchString Array of strings that should all be present in the object name
     * @returns The found Object3D part or null if not found
     */
    private findAvatarPart(obj: Object3D, searchString: string[]): Object3D | null {

        const name = obj.name.toLowerCase();
        let matchesAll = true;
        for (const str of searchString) {
            if (!matchesAll) break;
            if (name.indexOf(str) === -1)
                matchesAll = false;
        }
        if (matchesAll) return obj;

        if (obj.children) {
            for (const child of obj.children) {
                const found = this.findAvatarPart(child, searchString);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Handles HTTP response errors from avatar loading operations.
     * @param response The fetch API response to check
     * @returns The response if it was ok
     * @throws Error with status text if response was not ok
     */
    private handleCustomAvatarErrors(response) {
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return response;
    }
}
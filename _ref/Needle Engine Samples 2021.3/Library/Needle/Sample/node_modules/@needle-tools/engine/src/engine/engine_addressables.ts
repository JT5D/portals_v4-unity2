import { Group, Object3D, Texture, TextureLoader } from "three";

import { getParam, resolveUrl } from "../engine/engine_utils.js";
import { destroy, type IInstantiateOptions, instantiate, InstantiateOptions, isDestroyed } from "./engine_gameobject.js";
import { getLoader } from "./engine_gltf.js";
import type { loadAsset } from "./engine_loaders.js";
import { processNewScripts } from "./engine_mainloop_utils.js";
import { BlobStorage } from "./engine_networking_blob.js";
import { registerPrefabProvider, syncInstantiate, SyncInstantiateOptions } from "./engine_networking_instantiate.js";
import { SerializationContext, TypeSerializer } from "./engine_serialization_core.js";
import { Context } from "./engine_setup.js";
import type { GLTF, IComponent, IGameObject, Model, SourceIdentifier } from "./engine_types.js";

const debug = getParam("debugaddressables");

/** 
 * The Addressables class is used to register and manage {@link AssetReference} types  
 * It can be accessed from components via {@link Context.Current} or {@link Context.addressables} (e.g. `this.context.addressables`)
 */
export class Addressables {

    private _context: Context;
    private _assetReferences: { [key: string]: AssetReference } = {};

    /** @internal */
    constructor(context: Context) {
        this._context = context;
        this._context.pre_update_callbacks.push(this.preUpdate);
    }

    /** @internal */
    dispose() {
        const preUpdateIndex = this._context.pre_update_callbacks.indexOf(this.preUpdate);
        if (preUpdateIndex >= 0) {
            this._context.pre_update_callbacks.splice(preUpdateIndex, 1);
        }
        for (const key in this._assetReferences) {
            const ref = this._assetReferences[key];
            ref?.unload();
        }
        this._assetReferences = {};
    }

    private preUpdate = () => {

    }


    /**
     * Find a registered AssetReference by its URL
     */
    findAssetReference(url: string): AssetReference | null {
        return this._assetReferences[url] || null;
    }

    /** 
     * Register an asset reference
     * @internal
     */
    registerAssetReference(ref: AssetReference): AssetReference {
        if (!ref.url) return ref;
        if (!this._assetReferences[ref.url]) {
            this._assetReferences[ref.url] = ref;
        }
        else {

            console.warn("Asset reference already registered", ref);
        }
        return ref;
    }

    /** @internal */
    unregisterAssetReference(ref: AssetReference) {
        if (!ref.url) return;
        delete this._assetReferences[ref.url];
    }
}

export type ProgressCallback = (asset: AssetReference, prog: ProgressEvent) => void;

const $assetReference = Symbol("assetReference");

/** ### AssetReferences can be used to load glTF or GLB assets  
 * Use {@link AssetReference.getOrCreateFromUrl} to get an AssetReference for a URL to be easily loaded. When using the same URL multiple times the same AssetReference will be returned, this avoids loading or creating the same asset multiple times.   
 * 
 * **Important methods:**
 * - {@link preload} to load the asset binary without creating an instance yet.
 * - {@link loadAssetAsync} to load the asset and create an instance.  
 * - {@link instantiate} to load the asset and create another instance.  
 * - {@link unload} to dispose allocated memory and destroy the asset instance.  
 * 
 * @example Loading an asset from a URL
 * ```ts
 * import { AssetReference } from '@needle-tools/engine';
 * const assetRef = AssetReference.getOrCreateFromUrl("https://example.com/myModel.glb");
 * const instance = await assetRef.loadAssetAsync();
 * scene.add(instance);
 * ```
 * 
 * @example Referencing an asset in a component and loading it on start
 * ```ts
 * import { Behaviour, serializable, AssetReference } from '@needle-tools/engine';
 * 
 * export class MyComponent extends Behaviour {
 * 
 *   @serializable(AssetReference)
 *   myModel?: AssetReference;
 *   
 *   // Load the model on start. Start is called after awake and onEnable
 *   start() { 
 *     if (this.myModel) {
 *       this.myModel.loadAssetAsync().then(instance => {
 *         if (instance) {
 *           // add the loaded model to this component's game object
 *           this.gameObject.add(instance); 
 *         }
 *       });
 *     }
 *   }
 * }
 * ```
 * 
 * ### Related:
 * - {@link ImageReference} to load external image URLs
 * - {@link FileReference} to load external file URLs
 * - {@link loadAsset} to load assets directly without using AssetReferences
 */
export class AssetReference {

    /**
     * Get an AssetReference for a URL to be easily loaded.  
     * AssetReferences are cached so calling this method multiple times with the same arguments will always return the same AssetReference.
     * @param url The URL of the asset to load. The url can be relative or absolute.
     * @param context The context to use for loading the asset  
     * @returns the AssetReference for the URL
     */
    static getOrCreateFromUrl(url: string, context?: Context): AssetReference {
        if (!context) {
            context = Context.Current;
            if (!context)
                throw new Error("Context is required when sourceId is a string. When you call this method from a component you can call it with \"getOrCreate(this, url)\" where \"this\" is the component.");
        }
        const addressables = context.addressables;
        const existing = addressables.findAssetReference(url);
        if (existing) return existing;
        const ref = new AssetReference(url, context.hash);
        addressables.registerAssetReference(ref);
        return ref;
    }

    /** 
     * Get an AssetReference for a URL to be easily loaded.   
     * AssetReferences are cached so calling this method multiple times with the same arguments will always return the same AssetReference.
     */
    static getOrCreate(sourceId: SourceIdentifier | IComponent, url: string, context?: Context): AssetReference {

        if (typeof sourceId === "string") {
            if (!context) {
                context = Context.Current;
                if (!context)
                    throw new Error("Context is required when sourceId is a string. When you call this method from a component you can call it with \"getOrCreate(this, url)\" where \"this\" is the component.");
            }
        }
        else {
            context = sourceId.context as Context;
            sourceId = sourceId.sourceId!;
        }

        const fullPath = resolveUrl(sourceId, url);
        if (debug) console.log("GetOrCreate Addressable from", sourceId, url, "FinalPath=", fullPath);
        const addressables = context.addressables;
        const existing = addressables.findAssetReference(fullPath);
        if (existing) return existing;
        const ref = new AssetReference(fullPath, context.hash);
        addressables.registerAssetReference(ref);
        return ref;
    }






    readonly isAssetReference = true;

    /**  
     * This is the loaded asset root object. If the asset is a glb/gltf file this will be the {@link three#Scene} object.
     */
    get rawAsset(): any { return this._rawAsset; }

    /** The loaded asset root
     */
    get asset(): Object3D | null {
        return this._glbRoot ?? (this._rawAsset?.scene || null);
    }

    protected set asset(val: Object3D | null) {
        if (val) {
            this._rawAsset = {
                animations: val.animations,
                scene: val,
                scenes: [val],
            }
        }
        else this._rawAsset = null;
    }


    /** The url of the loaded asset (or the asset to be loaded) 
     * @deprecated use url */
    get uri(): string {
        return this._url;
    }
    /** The url of the loaded asset (or the asset to be loaded) */
    get url(): string {
        return this._url;
    }

    /** The name of the assigned url. This name is deduced from the url and might not reflect the actual name of the asset */
    get urlName(): string {
        return this._urlName;
    };

    /**
     * @returns true if the uri is a valid URL (http, https, blob)
     */
    get hasUrl() {
        return this._url !== undefined &&
            (this._url.startsWith("http") || this._url.startsWith("blob:") || this._url.startsWith("www.") || this._url.includes("/"));
    }

    private _rawAsset: Model | null = null;
    private _glbRoot?: Object3D | null;
    private _url: string;
    private _urlName: string;
    private _progressListeners: ProgressCallback[] = [];

    private _isLoadingRawBinary: boolean = false;
    private _rawBinary?: ArrayBufferLike | null;

    /** @internal */
    constructor(params: { url: string } | { asset: Object3D })
    constructor(uri: string, _hash?: string, asset?: any)
    constructor(...args: any[]) {

        if (typeof args[0] === "object") {
            if ("url" in args[0]) {
                this._url = args[0].url;
            }
            else {
                this._url = "";
                if (args[0].asset) this.asset = args[0].asset;
            }
        }
        else {
            this._url = args[0];
            if (args[2] instanceof Object3D) this.asset = args[2];
        }


        const lastUriPart = this._url.lastIndexOf("/");
        if (lastUriPart >= 0) {
            this._urlName = this._url.substring(lastUriPart + 1);
            // remove file extension
            const lastDot = this._urlName.lastIndexOf(".");
            if (lastDot >= 0) {
                this._urlName = this._urlName.substring(0, lastDot);
            }
        }
        else {
            this._urlName = this._url;
        }

        registerPrefabProvider(this._url, this.onResolvePrefab.bind(this));
    }

    private async onResolvePrefab(url: string): Promise<Object3D | null> {
        if (url === this.url) {
            if (this.mustLoad) await this.loadAssetAsync();
            if (this.asset) {
                return this.asset;
            }
        }
        return null;
    }

    private get mustLoad() {
        return !this.asset || (this.asset as any).__destroyed === true || isDestroyed(this.asset) === true;
    }

    private _loadingPromise: Promise<Model | null | undefined> | null = null;

    /**
     * @returns `true` if the asset has been loaded (via preload) or if it exists already (assigned to `asset`) */
    isLoaded() { return this._rawBinary || this.asset !== undefined }

    /** frees previously allocated memory and destroys the current `asset` instance (if any) */
    unload() {
        if (this.asset) {
            if (debug) console.log("Unload", this.asset);
            // TODO: we need a way to remove objects from the context (including components) without actually "destroying" them
            if ("scene" in this.asset && this.asset.scene)
                destroy(this.asset.scene as Object3D, true, true);
            destroy(this.asset, true, true);
        }
        this.asset = null;
        this._rawBinary = undefined;
        this._glbRoot = null;
        this._loadingPromise = null;
        if (Context.Current) {
            Context.Current.addressables.unregisterAssetReference(this);
        }
    }

    /** loads the asset binary without creating an instance */
    async preload(): Promise<ArrayBufferLike | null> {
        if (!this.mustLoad) return null;
        if (this._isLoadingRawBinary) return null;
        if (this._rawBinary !== undefined) return this._rawBinary;
        this._isLoadingRawBinary = true;
        if (debug) console.log("Preload", this.url);
        const res = await BlobStorage.download(this.url, p => {
            this.raiseProgressEvent(p);
        });
        this._rawBinary = res?.buffer ?? null;
        this._isLoadingRawBinary = false;
        return this._rawBinary;
    }

    // TODO: we need a way to abort loading a resource
    /** Loads the asset and creates one instance (assigned to `asset`)
     * @returns the loaded asset
     */
    async loadAssetAsync(prog?: ProgressCallback | null): Promise<Object3D | null> {
        if (debug) console.log("[AssetReference] loadAssetAsync", this.url);
        if (!this.mustLoad) return this.asset;

        if (prog) this._progressListeners.push(prog);

        if (this._loadingPromise !== null) {
            return this._loadingPromise.then(_ => this.asset);
        }
        const context = Context.Current;
        // TODO: technically we shouldnt call awake only when the object is added to a scene
        // addressables now allow loading things without adding them to a scene immediately
        // we should "address" (LUL) this
        // console.log("START LOADING");
        if (this._rawBinary) {
            if (!(this._rawBinary instanceof ArrayBuffer)) {
                console.error("[AssetReference] Failed loading – Invalid data. Must be of type ArrayBuffer. " + (typeof this._rawBinary));
                return null;
            }
            this._loadingPromise = getLoader().parseSync(context, this._rawBinary, this.url, null);
            this.raiseProgressEvent(new ProgressEvent("progress", { loaded: this._rawBinary.byteLength, total: this._rawBinary.byteLength }));
        }
        else {
            if (debug) console.log("Load async", this.url);
            this._loadingPromise = getLoader().loadSync(context, this.url, this.url, null, prog => {
                this.raiseProgressEvent(prog);
            });
        }
        this._loadingPromise.finally(() => this._loadingPromise = null);
        const res = await this._loadingPromise;
        // clear all progress listeners after download has finished
        this._progressListeners.length = 0;
        this._glbRoot = this.tryGetActualGameObjectRoot(res);
        if (res) {
            // Make sure the loaded roots all have a reference to this AssetReference
            // that was originally loading it.
            // We need this when the loaded asset is being disposed
            // TODO: we have to prevent disposing resources that are still in use
            res[$assetReference] = this;
            if (this._glbRoot) this._glbRoot[$assetReference] = this;
            if (this.asset) this.asset[$assetReference] = this;

            // we need to handle the pre_setup callsbacks before instantiating
            // because that is where deserialization happens
            processNewScripts(context);

            if (res.scene !== undefined) {
                this._rawAsset = res;
            }
            return this.asset;
        }
        return null;
    }

    /** loads and returns a new instance of `asset` */
    instantiate(parent?: Object3D | IInstantiateOptions | null) {
        return this.onInstantiate(parent, false);
    }

    /** loads and returns a new instance of `asset` - this call is networked so an instance will be created on all connected users */
    instantiateSynced(parent?: Object3D | SyncInstantiateOptions, saveOnServer: boolean = true) {
        return this.onInstantiate(parent, true, saveOnServer);
    }

    beginListenDownload(evt: ProgressCallback) {
        if (this._progressListeners.indexOf(evt) < 0)
            this._progressListeners.push(evt);
    }

    endListenDownload(evt: ProgressCallback) {
        const index = this._progressListeners.indexOf(evt);
        if (index >= 0) {
            this._progressListeners.splice(index, 1);
        }
    }

    private raiseProgressEvent(prog: ProgressEvent) {
        for (const list of this._progressListeners) {
            list(this, prog);
        }
    }


    private static readonly currentlyInstantiating: Map<string, number> = new Map<string, number>();

    private async onInstantiate(opts?: Object3D | IInstantiateOptions | SyncInstantiateOptions | null, networked: boolean = false, saveOnServer?: boolean): Promise<Object3D | null> {
        const context = Context.Current;

        // clone the instantiate options immediately
        // in case the user is not awaiting this call and already modifying the options
        const options = new InstantiateOptions();
        if (opts instanceof Object3D) {
            options.parent = opts;
        }
        else if (opts) {
            // Assign to e.g. have SyncInstantiateOptions
            Object.assign(options, opts);
            options.cloneAssign(opts);
        }
        if (options.parent === undefined) options.parent = context.scene;

        // ensure the asset is loaded
        if (this.mustLoad) {
            await this.loadAssetAsync();
        }
        if (debug)
            console.log("Instantiate", this.url, "parent:", opts);

        if (this.asset) {
            if (debug) console.log("Add to scene", this.asset);

            let count = AssetReference.currentlyInstantiating.get(this.url);
            // allow up to 10000 instantiations of the same prefab in the same frame
            if (count !== undefined && count >= 10000) {
                console.error("Recursive or too many instantiations of " + this.url + " in the same frame (" + count + ")");
                return null;
            }
            try {
                if (count === undefined) count = 0;
                count += 1;
                AssetReference.currentlyInstantiating.set(this.url, count);
                if (networked) {
                    options.context = context;
                    const prefab = this.asset;
                    prefab.guid = this.url;
                    const instance = syncInstantiate(prefab, options, undefined, saveOnServer);
                    if (instance) {
                        return instance;
                    }
                }
                else {
                    const instance = instantiate(this.asset, options);
                    if (instance) {
                        return instance;
                    }
                }
            }
            finally {
                context.post_render_callbacks.push(() => {
                    if (count === undefined || count < 0) count = 0;
                    else count -= 1;
                    AssetReference.currentlyInstantiating.set(this.url, count)
                });
            }

        }
        else if (debug) console.warn("Failed to load asset", this.url);
        return null;
    }

    /**
     * try to ignore the intermediate created object
     * because it causes trouble if we instantiate an assetreference per player
     * and call destroy on the player marker root
     * @returns the scene root object if the asset was a glb/gltf
     */
    private tryGetActualGameObjectRoot(asset: any): Object3D | null {
        if (asset && asset.scene) {
            // some exporters produce additional root objects
            const scene = asset.scene as Group;
            if (scene.isGroup && scene.children.length === 1 && scene.children[0].name + "glb" === scene.name) {
                const root = scene.children[0];
                // HACK we want to keep the animations on the root object. Please keep in sync with engine_loader. This is so autoplay animations works (e.g. with AnimationUtils.autoplayAnimations where we get the animations from the root object). One case where an additioanl root exists is the SOC old mcdonald scene
                root.animations = scene.animations;
                return root;
            }
            // ok the scene is the scene, just use that then
            else
                return scene;
        }
        return null;
    }

}




class AddressableSerializer extends TypeSerializer {

    constructor() {
        super([AssetReference], "AssetReferenceSerializer");
    }

    onSerialize(data: any, _context: SerializationContext) {
        if (data && data.uri !== undefined && typeof data.uri === "string") {
            return data.uri;
        }
    }

    onDeserialize(data: any, context: SerializationContext) {
        if (typeof data === "string") {
            if (!context.context) {
                console.error("Missing context");
                return null;
            }
            if (!context.gltfId) {
                console.error("Missing source id");
                return null;
            }
            const ref = AssetReference.getOrCreate(context.gltfId, data, context.context);
            return ref;
        }
        else if (data instanceof Object3D) {
            if (!context.context) {
                console.error("Missing context");
                return null;
            }
            if (!context.gltfId) {
                console.error("Missing source id");
                return null;
            }
            const obj = data;
            const ctx = context.context;
            const guid = obj["guid"] ?? obj.uuid;
            const existing = ctx.addressables.findAssetReference(guid);
            if (existing) return existing;
            const ref = new AssetReference(guid, undefined, obj);
            ctx.addressables.registerAssetReference(ref);
            return ref;
        }
        return null;
    }

}
new AddressableSerializer();



const failedTexturePromise = Promise.resolve(null);

/**  
 * Load images or textures from external URLs.
 * 
 * **Important methods:**
 * - {@link createHTMLImage} to create an HTMLImageElement from the URL
 * - {@link createTexture} to create a Three.js Texture from the URL
 * 
 * @example
 * ```ts
 * import { ImageReference, serializable } from '@needle-tools/engine';
 * 
 * export class MyComponent extends Behaviour {
 *   @serializable(ImageReference)  
 *   myImage?:ImageReference;
 *   async start() {
 *     if(this.myImage) {
 *       const texture = await this.myImage.createTexture();
 *       if(texture) {
 *         // use the texture
 *       }
 *     }
 *   }
 * ```
 * 
 * ### Related:
 * - {@link AssetReference} to load glTF or GLB assets
 * - {@link FileReference} to load external file URLs
 */
export class ImageReference {

    private static imageReferences = new Map<string, ImageReference>();

    static getOrCreate(url: string) {
        let ref = ImageReference.imageReferences.get(url);
        if (!ref) {
            ref = new ImageReference(url);
            ImageReference.imageReferences.set(url, ref);
        }
        return ref;
    }

    constructor(url: string) {
        this.url = url;
    }

    readonly url!: string;

    private _bitmap?: Promise<ImageBitmap | null>;
    private _bitmapObject?: ImageBitmap;

    dispose() {
        if (this._bitmapObject) {
            this._bitmapObject.close();
        }
        this._bitmap = undefined;
    }

    createHTMLImage(): HTMLImageElement {
        const img = new Image();
        img.src = this.url;
        return img;
    }

    private loader: TextureLoader | null = null;
    createTexture(): Promise<Texture | null> {
        if (!this.url) {
            console.error("Can not load texture without url");
            return failedTexturePromise;
        }

        if (!this.loader) this.loader = new TextureLoader();
        this.loader.setCrossOrigin("anonymous");
        return this.loader.loadAsync(this.url).then(res => {
            if (res && !res.name?.length) {
                // default name if no name is defined
                res.name = this.url.split("/").pop() ?? this.url;
            }
            return res;
        })
        // return this.getBitmap().then((bitmap) => {
        //     if (bitmap) {
        //         const texture = new Texture(bitmap);
        //         texture.needsUpdate = true;
        //         return texture;
        //     }
        //     return null;
        // });
    }

    /** Loads the bitmap data of the image */
    getBitmap(): Promise<ImageBitmap | null> {
        if (this._bitmap) return this._bitmap;
        this._bitmap = new Promise((res, _) => {
            const imageElement = document.createElement("img") as HTMLImageElement;
            imageElement.addEventListener("load", () => {
                this._bitmap = createImageBitmap(imageElement).then((bitmap) => {
                    this._bitmapObject = bitmap;
                    res(bitmap);
                    return bitmap;
                })
            });
            imageElement.addEventListener("error", err => {
                console.error("Failed to load image:" + this.url, err);
                res(null);
            });
            imageElement.src = this.url;
        });
        return this._bitmap;
    }
}


/** @internal */
export class ImageReferenceSerializer extends TypeSerializer {
    constructor() {
        super([ImageReference], "ImageReferenceSerializer");
    }

    onSerialize(_data: string, _context: SerializationContext) {
        return null;
    }

    onDeserialize(data: string, _context: SerializationContext) {
        if (typeof data === "string") {
            const url = resolveUrl(_context.gltfId, data)
            return ImageReference.getOrCreate(url);
        }
        return undefined;
    }
}
new ImageReferenceSerializer();



/** 
 * Use this if a file is a external file URL. The file can be any arbitrary binary data like a videofile or a text asset.  
 * 
 * ### Related:
 * - {@link AssetReference} to load glTF or GLB assets
 * - {@link ImageReference} to load external image URLs
 */
export class FileReference {

    private static cache = new Map<string, FileReference>();

    static getOrCreate(url: string) {
        let ref = FileReference.cache.get(url);
        if (!ref) {
            ref = new FileReference(url);
            FileReference.cache.set(url, ref);
        }
        return ref;
    }

    /** Load the file binary data
     * @returns a promise that resolves to the binary data of the file. Make sure to await this request or use `.then(res => {...})` to get the result.
     */
    async loadRaw(): Promise<Blob> {
        if (!this.res) this.res = fetch(this.url);
        return this.res.then(res => res.blob());
    }

    /** Load the file as text (if the referenced file is a text file like a .txt or .json file)
     * @returns a promise that resolves to the text data of the file. Make sure to await this request or use `.then(res => {...})` to get the result. If the format is json you can use `JSON.parse(result)` to convert it to a json object
     */
    async loadText(): Promise<string> {
        if (!this.res) this.res = fetch(this.url);
        return this.res.then(res => res.text());
    }

    /** The resolved url to the file */
    readonly url: string;

    private res?: Promise<Response>;

    constructor(url: string) {
        this.url = url;
    }
}


/** @internal */
export class FileReferenceSerializer extends TypeSerializer {
    constructor() {
        super([FileReference], "FileReferenceSerializer");
    }

    onSerialize(_data: string, _context: SerializationContext) {
        return null;
    }

    onDeserialize(data: string, _context: SerializationContext) {
        if (typeof data === "string") {
            const url = resolveUrl(_context.gltfId, data)
            return FileReference.getOrCreate(url);
        }
        return undefined;
    }
}
new FileReferenceSerializer();
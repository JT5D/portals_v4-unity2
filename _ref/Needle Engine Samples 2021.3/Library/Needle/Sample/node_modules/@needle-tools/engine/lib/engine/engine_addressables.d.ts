import { Object3D, Texture } from "three";
import { type IInstantiateOptions } from "./engine_gameobject.js";
import { SyncInstantiateOptions } from "./engine_networking_instantiate.js";
import { SerializationContext, TypeSerializer } from "./engine_serialization_core.js";
import { Context } from "./engine_setup.js";
import type { IComponent, SourceIdentifier } from "./engine_types.js";
/**
 * The Addressables class is used to register and manage {@link AssetReference} types
 * It can be accessed from components via {@link Context.Current} or {@link Context.addressables} (e.g. `this.context.addressables`)
 */
export declare class Addressables {
    private _context;
    private _assetReferences;
    /** @internal */
    constructor(context: Context);
    /** @internal */
    dispose(): void;
    private preUpdate;
    /**
     * Find a registered AssetReference by its URL
     */
    findAssetReference(url: string): AssetReference | null;
    /**
     * Register an asset reference
     * @internal
     */
    registerAssetReference(ref: AssetReference): AssetReference;
    /** @internal */
    unregisterAssetReference(ref: AssetReference): void;
}
export type ProgressCallback = (asset: AssetReference, prog: ProgressEvent) => void;
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
export declare class AssetReference {
    /**
     * Get an AssetReference for a URL to be easily loaded.
     * AssetReferences are cached so calling this method multiple times with the same arguments will always return the same AssetReference.
     * @param url The URL of the asset to load. The url can be relative or absolute.
     * @param context The context to use for loading the asset
     * @returns the AssetReference for the URL
     */
    static getOrCreateFromUrl(url: string, context?: Context): AssetReference;
    /**
     * Get an AssetReference for a URL to be easily loaded.
     * AssetReferences are cached so calling this method multiple times with the same arguments will always return the same AssetReference.
     */
    static getOrCreate(sourceId: SourceIdentifier | IComponent, url: string, context?: Context): AssetReference;
    readonly isAssetReference = true;
    /**
     * This is the loaded asset root object. If the asset is a glb/gltf file this will be the {@link three#Scene} object.
     */
    get rawAsset(): any;
    /** The loaded asset root
     */
    get asset(): Object3D | null;
    protected set asset(val: Object3D | null);
    /** The url of the loaded asset (or the asset to be loaded)
     * @deprecated use url */
    get uri(): string;
    /** The url of the loaded asset (or the asset to be loaded) */
    get url(): string;
    /** The name of the assigned url. This name is deduced from the url and might not reflect the actual name of the asset */
    get urlName(): string;
    /**
     * @returns true if the uri is a valid URL (http, https, blob)
     */
    get hasUrl(): boolean;
    private _rawAsset;
    private _glbRoot?;
    private _url;
    private _urlName;
    private _progressListeners;
    private _isLoadingRawBinary;
    private _rawBinary?;
    /** @internal */
    constructor(params: {
        url: string;
    } | {
        asset: Object3D;
    });
    constructor(uri: string, _hash?: string, asset?: any);
    private onResolvePrefab;
    private get mustLoad();
    private _loadingPromise;
    /**
     * @returns `true` if the asset has been loaded (via preload) or if it exists already (assigned to `asset`) */
    isLoaded(): boolean | ArrayBuffer;
    /** frees previously allocated memory and destroys the current `asset` instance (if any) */
    unload(): void;
    /** loads the asset binary without creating an instance */
    preload(): Promise<ArrayBufferLike | null>;
    /** Loads the asset and creates one instance (assigned to `asset`)
     * @returns the loaded asset
     */
    loadAssetAsync(prog?: ProgressCallback | null): Promise<Object3D | null>;
    /** loads and returns a new instance of `asset` */
    instantiate(parent?: Object3D | IInstantiateOptions | null): Promise<Object3D<import("three").Object3DEventMap> | null>;
    /** loads and returns a new instance of `asset` - this call is networked so an instance will be created on all connected users */
    instantiateSynced(parent?: Object3D | SyncInstantiateOptions, saveOnServer?: boolean): Promise<Object3D<import("three").Object3DEventMap> | null>;
    beginListenDownload(evt: ProgressCallback): void;
    endListenDownload(evt: ProgressCallback): void;
    private raiseProgressEvent;
    private static readonly currentlyInstantiating;
    private onInstantiate;
    /**
     * try to ignore the intermediate created object
     * because it causes trouble if we instantiate an assetreference per player
     * and call destroy on the player marker root
     * @returns the scene root object if the asset was a glb/gltf
     */
    private tryGetActualGameObjectRoot;
}
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
export declare class ImageReference {
    private static imageReferences;
    static getOrCreate(url: string): ImageReference;
    constructor(url: string);
    readonly url: string;
    private _bitmap?;
    private _bitmapObject?;
    dispose(): void;
    createHTMLImage(): HTMLImageElement;
    private loader;
    createTexture(): Promise<Texture | null>;
    /** Loads the bitmap data of the image */
    getBitmap(): Promise<ImageBitmap | null>;
}
/** @internal */
export declare class ImageReferenceSerializer extends TypeSerializer {
    constructor();
    onSerialize(_data: string, _context: SerializationContext): null;
    onDeserialize(data: string, _context: SerializationContext): ImageReference | undefined;
}
/**
 * Use this if a file is a external file URL. The file can be any arbitrary binary data like a videofile or a text asset.
 *
 * ### Related:
 * - {@link AssetReference} to load glTF or GLB assets
 * - {@link ImageReference} to load external image URLs
 */
export declare class FileReference {
    private static cache;
    static getOrCreate(url: string): FileReference;
    /** Load the file binary data
     * @returns a promise that resolves to the binary data of the file. Make sure to await this request or use `.then(res => {...})` to get the result.
     */
    loadRaw(): Promise<Blob>;
    /** Load the file as text (if the referenced file is a text file like a .txt or .json file)
     * @returns a promise that resolves to the text data of the file. Make sure to await this request or use `.then(res => {...})` to get the result. If the format is json you can use `JSON.parse(result)` to convert it to a json object
     */
    loadText(): Promise<string>;
    /** The resolved url to the file */
    readonly url: string;
    private res?;
    constructor(url: string);
}
/** @internal */
export declare class FileReferenceSerializer extends TypeSerializer {
    constructor();
    onSerialize(_data: string, _context: SerializationContext): null;
    onDeserialize(data: string, _context: SerializationContext): FileReference | undefined;
}

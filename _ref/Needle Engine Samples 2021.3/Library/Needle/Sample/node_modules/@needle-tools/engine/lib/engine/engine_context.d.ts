/// <reference types="webxr" />
import 'three/examples/jsm/renderers/webgl-legacy/nodes/WebGLNodes.js';
import type { EffectComposer } from "postprocessing";
import { BufferGeometry, Camera, DepthTexture, Group, Material, Object3D, OrthographicCamera, PerspectiveCamera, Scene, Texture, WebGLRenderer, type WebGLRendererParameters, type WebXRArrayCamera } from 'three';
import type { EffectComposer as ThreeEffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { Addressables } from './engine_addressables.js';
import { AnimationsRegistry } from './engine_animation.js';
import { Application } from './engine_application.js';
import { AssetDatabase } from './engine_assetdatabase.js';
import { FocusRect, FocusRectSettings } from './engine_camera.js';
import { Input } from './engine_input.js';
import { type ILightDataRegistry } from './engine_lightdata.js';
import { LODsManager } from "./engine_lods.js";
import { NetworkConnection } from './engine_networking.js';
import { Physics } from './engine_physics.js';
import { PlayerViewManager } from './engine_playerview.js';
import { RendererData as SceneLighting } from './engine_scenelighting.js';
import { Time } from './engine_time.js';
import type { CoroutineData, ICamera, IComponent, IContext, ILight, Model, SourceIdentifier, Vec2 } from "./engine_types.js";
import type { INeedleXRSessionEventReceiver, NeedleXRSession } from './engine_xr.js';
import { NeedleMenu } from './webcomponents/needle menu/needle-menu.js';
import type { NeedleEngineWebComponent } from './webcomponents/needle-engine.js';
export declare const build_scene_functions: {
    [name: string]: (context: Context) => Promise<void>;
};
export declare class LoadingProgressArgs {
    /** the name or URL of the loaded file */
    name: string;
    /** the loading progress event from the loader */
    progress: ProgressEvent;
    /** the index of the loaded file */
    index: number;
    /** the total number of files to load */
    count: number;
}
export declare class ContextCreateArgs {
    /** list of glTF or GLB files to load */
    files: Array<string>;
    abortSignal?: AbortSignal;
    /** called when loading a provided glTF file started */
    onLoadingStart?: (index: number, file: string) => void;
    /** called on update for each loaded glTF file */
    onLoadingProgress?: (args: LoadingProgressArgs) => void;
    /** Called after a gLTF file has finished loading */
    onLoadingFinished?: (index: number, file: string, glTF: Model | null) => void;
}
export declare class ContextArgs {
    name?: string;
    /** for debugging only */
    alias?: string;
    /** the hash is used as a seed when initially loading the scene files */
    hash?: string;
    /** when true the context will not check if it's visible in the viewport and always update and render */
    runInBackground?: boolean;
    /** the DOM element the context belongs to or is inside of (this does not have to be the canvas. use renderer.domElement if you want to access the dom canvas) */
    domElement?: HTMLElement | null;
    /** externally owned renderer */
    renderer?: WebGLRenderer;
    /** externally owned camera */
    camera?: Camera;
    /** externally owned scene */
    scene?: Scene;
}
export declare enum FrameEvent {
    Start = -1,
    EarlyUpdate = 0,
    Update = 1,
    LateUpdate = 2,
    OnBeforeRender = 3,
    OnAfterRender = 4,
    PrePhysicsStep = 9,
    PostPhysicsStep = 10,
    Undefined = -1
}
/** threejs callback event signature */
export declare type OnRenderCallback = (renderer: WebGLRenderer, scene: Scene, camera: Camera, geometry: BufferGeometry, material: Material, group: Group) => void;
export declare function registerComponent(script: IComponent, context?: Context): void;
/**
 * The Needle Engine context is the main access point that holds all the data and state of a Needle Engine application.
 * It can be used to access the {@link Context.scene}, {@link Context.renderer}, {@link Context.mainCamera}, {@link Context.input}, {@link Context.physics}, {@link Context.time}, {@link Context.connection} (networking), and more.
 *
 * The context is automatically created when using the `<needle-engine>` web component.
 *
 * @example Accessing the context from a [component](https://engine.needle.tools/docs/api/Behaviour):
 * ```typescript
 * import { Behaviour } from "@needle-tools/engine";
 * import { Mesh, BoxGeometry, MeshBasicMaterial } from "three";
 * export class MyScript extends Behaviour {
 *   start() {
 *     console.log("Hello from MyScript");
 *     this.context.scene.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
 *   }
 * }
 * ```
 *
 * @example Accessing the context from a [hook](https://engine.needle.tools/docs/scripting.html#hooks) without a component e.g. from a javascript module or svelte or react component.
 *
 * ```typescript
 * import { onStart } from "@needle-tools/engine";
 *
 * onStart((context) => {
 *   console.log("Hello from onStart hook");
 *   context.scene.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
 * });
 * ```
 *
 */
export declare class Context implements IContext {
    private static _defaultTargetFramerate;
    /** When a new context is created this is the framerate that will be used by default */
    static get DefaultTargetFrameRate(): number | undefined;
    /** When a new context is created this is the framerate that will be used by default */
    static set DefaultTargetFrameRate(val: number | undefined);
    private static _defaultWebglRendererParameters;
    /** The default parameters that will be used when creating a new WebGLRenderer.
     * Modify in global context to change the default parameters for all new contexts.
     * @example
     * ```typescript
     * import { Context } from "@needle-tools/engine";
     * Context.DefaultWebGLRendererParameters.antialias = false;
     * ```
     */
    static get DefaultWebGLRendererParameters(): WebGLRendererParameters;
    /** The needle engine version */
    get version(): string;
    /** The currently active context. Only set during the update loops */
    static get Current(): Context;
    /** @internal this property should not be set by user code */
    static set Current(context: Context);
    static get All(): Context[];
    /** The name of the context */
    name: string;
    /** An alias for the context */
    alias: string | undefined | null;
    /** When the renderer or camera are managed by an external process (e.g. when running in r3f context).
     * When this is false you are responsible to call update(timestamp, xframe.
     * It is also currently assumed that rendering is handled performed by an external process
     * */
    isManagedExternally: boolean;
    /** set to true to pause the update loop. You can receive an event for it in your components.
     * Note that script updates will not be called when paused */
    isPaused: boolean;
    /** When enabled the application will run while not visible on the page */
    runInBackground: boolean;
    /**
     * Set to the target framerate you want your application to run in (you can use ?stats to check the fps)
     * Set to undefined if you want to run at the maximum framerate
     */
    targetFrameRate?: number | {
        value?: number;
    };
    /** Use a higher number for more accurate physics simulation.
     * When undefined physics steps will be 1 for mobile devices and 5 for desktop devices
     * Set to 0 to disable physics updates
     * TODO: changing physics steps is currently not supported because then forces that we get from the character controller and rigidbody et al are not correct anymore - this needs to be properly tested before making this configureable
    */
    private physicsSteps?;
    /** used to append to loaded assets */
    hash?: string;
    /** The `<needle-engine>` web component */
    domElement: NeedleEngineWebComponent | HTMLElement;
    appendHTMLElement(element: HTMLElement): HTMLElement;
    get resolutionScaleFactor(): number;
    /** use to scale the resolution up or down of the renderer. default is 1 */
    set resolutionScaleFactor(val: number);
    private _resolutionScaleFactor;
    private _boundingClientRectFrame;
    private _boundingClientRect;
    private _domX;
    private _domY;
    /** update bounding rects + domX, domY */
    private calculateBoundingClientRect;
    /** The width of the `<needle-engine>` element on the website */
    get domWidth(): number;
    /** The height of the `<needle-engine>` element on the website */
    get domHeight(): number;
    /** the X position of the `<needle-engine>` element on the website */
    get domX(): number;
    /** the Y position of the `<needle-engine>` element on the website */
    get domY(): number;
    /**
     * Is a XR session currently active and presenting?
     * @returns true if the xr renderer is currently presenting
     */
    get isInXR(): boolean;
    /** shorthand for `NeedleXRSession.active`
     * Automatically set by NeedleXRSession when a XR session is active
     * @returns the active XR session or null if no session is active
     * */
    xr: NeedleXRSession | null;
    /**
     * Shorthand for `this.xr?.mode`. AR or VR
     * @returns the current XR session mode (immersive-vr or immersive-ar)
     */
    get xrSessionMode(): XRSessionMode | undefined;
    /** Shorthand for `this.xrSessionMode === "immersive-vr"`
     * @returns true if a webxr VR session is currently active.
     */
    get isInVR(): boolean;
    /**
     * Shorthand for `this.xrSessionMode === "immersive-ar"`
     * @returns true if a webxr AR session is currently active.
     */
    get isInAR(): boolean;
    /** If a XR session is active and in pass through mode (immersive-ar on e.g. Quest)
     * @returns true if the XR session is in pass through mode
     */
    get isInPassThrough(): boolean;
    /** access the raw `XRSession` object (shorthand for `context.renderer.xr.getSession()`). For more control use `NeedleXRSession.active` */
    get xrSession(): XRSession | null;
    /** @returns the latest XRFrame (if a XRSession is currently active)
     * @link https://developer.mozilla.org/en-US/docs/Web/API/XRFrame
     */
    get xrFrame(): XRFrame | null;
    /** @returns the current WebXR camera while the WebXRManager is active (shorthand for `context.renderer.xr.getCamera()`) */
    get xrCamera(): WebXRArrayCamera | undefined;
    private _xrFrame;
    /**
     * The AR overlay element is used to display 2D HTML elements while a AR session is active.
     */
    get arOverlayElement(): HTMLElement;
    /**
     * Current event of the update cycle (e.g. `FrameEvent.EarlyUpdate` or `FrameEvent.OnBeforeRender`)
     */
    get currentFrameEvent(): FrameEvent;
    private _currentFrameEvent;
    /**
     * The scene contains all objects in the hierarchy and is automatically rendered by the context every frane.
     */
    scene: Scene;
    /**
     * The renderer is used to render the scene. It is automatically created when the context is created.
     */
    renderer: WebGLRenderer;
    /**
     * The effect composer can be used to render postprocessing effects. If assigned then it will automatically render the scene every frame.
     */
    composer: EffectComposer | ThreeEffectComposer | null;
    /**
     * @internal All known components. Don't use directly
     */
    readonly scripts: IComponent[];
    /**
     * @internal All paused components. Don't use directly
     */
    readonly scripts_pausedChanged: IComponent[];
    /**
     * @internal All components that have a early update event. Don't use directly
     */
    readonly scripts_earlyUpdate: IComponent[];
    /**
     * @internal All components that have a update event. Don't use directly
     */
    readonly scripts_update: IComponent[];
    /**
     * @internal All components that have a late update event. Don't use directly
     */
    readonly scripts_lateUpdate: IComponent[];
    /**
     * @internal All components that have a onBeforeRender event. Don't use directly
     */
    readonly scripts_onBeforeRender: IComponent[];
    /**
     * @internal All components that have a onAfterRender event. Don't use directly
     */
    readonly scripts_onAfterRender: IComponent[];
    /**
     * @internal All components that have coroutines. Don't use directly
     */
    readonly scripts_WithCorroutines: IComponent[];
    /**
     * @internal Components with immersive-vr event methods. Don't use directly
     */
    readonly scripts_immersive_vr: INeedleXRSessionEventReceiver[];
    /**
     * @internal Components with immersive-ar event methods. Don't use directly
     */
    readonly scripts_immersive_ar: INeedleXRSessionEventReceiver[];
    /**
     * @internal Coroutine data
     */
    readonly coroutines: {
        [FrameEvent: number]: Array<CoroutineData>;
    };
    /** callbacks called once after the context has been created */
    readonly post_setup_callbacks: Function[];
    /** called every frame at the beginning of the frame (after component start events and before earlyUpdate) */
    readonly pre_update_callbacks: Function[];
    /** called every frame before rendering (after all component events) */
    readonly pre_render_callbacks: Array<(frame: XRFrame | null) => void>;
    /** called every frame after rendering (after all component events) */
    readonly post_render_callbacks: Function[];
    /** called every frame befroe update (this list is emptied every frame) */
    readonly pre_update_oneshot_callbacks: Function[];
    /** @internal */
    readonly new_scripts: IComponent[];
    /** @internal */
    readonly new_script_start: IComponent[];
    /** @internal */
    readonly new_scripts_pre_setup_callbacks: Function[];
    /** @internal */
    readonly new_scripts_post_setup_callbacks: Function[];
    /** @internal */
    readonly new_scripts_xr: INeedleXRSessionEventReceiver[];
    /**
     * The **main camera component** of the scene - this camera is used for rendering.
     * Use `setCurrentCamera` for updating the main camera.
     */
    mainCameraComponent: ICamera | undefined;
    /**
     * The main camera of the scene - this camera is used for rendering
     * Use `setCurrentCamera` for updating the main camera.
     */
    get mainCamera(): Camera;
    /** Set the main camera of the scene. If set to null the camera of the {@link mainCameraComponent} will be used - this camera is used for rendering */
    set mainCamera(cam: Camera | null);
    private _mainCamera;
    private _fallbackCamera;
    /** access application state (e.g. if all audio should be muted) */
    application: Application;
    /** access animation mixer used by components in the scene */
    animations: AnimationsRegistry;
    /** access timings (current frame number, deltaTime, timeScale, ...) */
    time: Time;
    /** access input data (e.g. click or touch events) */
    input: Input;
    /** access physics related methods (e.g. raycasting). To access the phyiscs engine use `context.physics.engine` */
    physics: Physics;
    /** access networking methods (use it to send or listen to messages or join a networking backend) */
    connection: NetworkConnection;
    /**  @deprecated AssetDatabase is deprecated */
    assets: AssetDatabase;
    /** The main light in the scene */
    mainLight: ILight | null;
    /** @deprecated Use sceneLighting */
    get rendererData(): SceneLighting;
    /** Access the scene lighting manager to control lighting settings in the context */
    sceneLighting: SceneLighting;
    addressables: Addressables;
    lightmaps: ILightDataRegistry;
    players: PlayerViewManager;
    /** Access the LODs manager to control LOD behavior in the context */
    readonly lodsManager: LODsManager;
    /** Access the needle menu to add or remove buttons to the menu element */
    readonly menu: NeedleMenu;
    /**
     * Checks if the context is fully created and ready
     * @returns true if the context is fully created and ready
     */
    get isCreated(): boolean;
    /**
     * The source identifier(s) of the root scene(s) loaded into this context.
     * When using `<needle-engine>` web component this will be the `src` attribute(s).
     * @returns The source identifier for of the root scene
    */
    get rootSourceId(): SourceIdentifier | undefined;
    private _needsUpdateSize;
    private _isCreated;
    private _isCreating;
    private _isVisible;
    private _stats;
    constructor(args?: ContextArgs);
    /**
     * Calling this function will dispose the current renderer and create a new one which will then be assigned to the context. It can be used to create a new renderer with custom WebGLRendererParameters.
     * **Note**: Instead you can also modify the static `Context.DefaultWebGlRendererParameters` before the context is created.
     * **Note**: This method is recommended because it re-uses an potentially already existing canvas element. This is necessary to keep input event handlers from working (e.g. components like OrbitControls subscribe to input events on the canvas)
     * @returns {WebGLRenderer} the newly created renderer
     */
    createNewRenderer(params?: WebGLRendererParameters): WebGLRenderer;
    private _intersectionObserver;
    private internalOnUpdateVisible;
    private _disposeCallbacks;
    /** will request a renderer size update the next render call (will call updateSize the next update) */
    requestSizeUpdate(): void;
    /** Clamps the renderer max resolution. If undefined the max resolution is not clamped. Default is undefined */
    maxRenderResolution?: Vec2;
    /** Control the renderer devicePixelRatio.
     * **Options**
     * - `auto` - Needle Engine automatically sets the pixel ratio to the current window.devicePixelRatio.
     * - `manual` - Needle Engine will not change the renderer pixel ratio. You can set it manually.
     * - `number` - Needle Engine will set the pixel ratio to the given number. The change will be applied to the renderer and the composer (if used) at the end of the current frame.
     */
    get devicePixelRatio(): "auto" | "manual" | number;
    set devicePixelRatio(val: "auto" | "manual" | number);
    private _devicePixelRatio;
    /**
     * Update the renderer and canvas size. This is also automatically called when a DOM size change is detected.
     */
    updateSize(force?: boolean): void;
    /**
     * Update the camera aspect ratio or orthorgraphic camera size. This is automatically called when a DOM size change is detected.
     */
    updateAspect(camera: PerspectiveCamera | OrthographicCamera, width?: number, height?: number): void;
    /** This will recreate the whole needle engine context and dispose the whole scene content
     * All content will be reloaded (loading times might be faster due to browser caches)
     * All scripts will be recreated */
    recreate(): void;
    private _originalCreationArgs?;
    /** @deprecated use create. This method will be removed in a future version */
    onCreate(opts?: ContextCreateArgs): Promise<boolean>;
    /** @internal */
    create(opts?: ContextCreateArgs): Promise<boolean>;
    private onUnhandledRejection;
    /** Dispatches an error */
    private onError;
    /**
     * Clears the context and destroys all scenes and objects in the scene.
     * The ContextCleared event is called at the end.
     * This is automatically called when e.g. the `src` attribute changes on `<needle-engine>`
     * or when the web component is removed from the DOM
     */
    clear(): void;
    /**
     * Dispose all allocated resources and clears the scene. This is automatically called e.g. when the `<needle-engine>` component is removed from the DOM.
     */
    dispose(): void;
    /**@deprecated use dispose()  */
    onDestroy(): void;
    private internalOnDestroy;
    /** @internal Automatically called by components when you call `startCoroutine`. Use `startCoroutine` instead  */
    registerCoroutineUpdate(script: IComponent, coroutine: Generator, evt: FrameEvent): Generator;
    /** @internal Automatically called by components. */
    unregisterCoroutineUpdate(coroutine: Generator, evt: FrameEvent): void;
    /** @internal Automatically called */
    stopAllCoroutinesFrom(script: IComponent): void;
    private _cameraStack;
    /** Change the main camera */
    setCurrentCamera(cam: ICamera): void;
    /**
     * Remove the camera from the mainCamera stack (if it has been set before with `setCurrentCamera`)
     */
    removeCamera(cam?: ICamera | null): void;
    private readonly _onBeforeRenderListeners;
    private readonly _onAfterRenderListeners;
    /** Use to subscribe to onBeforeRender events on threejs objects.
     * @link https://threejs.org/docs/#api/en/core/Object3D.onBeforeRender
     */
    addBeforeRenderListener(target: Object3D, callback: OnRenderCallback): void;
    /** Remove callback from three `onBeforeRender` event (if it has been added with `addBeforeRenderListener(...)`)
     * @link https://threejs.org/docs/#api/en/core/Object3D.onBeforeRender
    */
    removeBeforeRenderListener(target: Object3D, callback: OnRenderCallback): void;
    /**
     * Subscribe to onAfterRender events on threejs objects
     * @link https://threejs.org/docs/#api/en/core/Object3D.onAfterRender
    */
    addAfterRenderListener(target: Object3D, callback: OnRenderCallback): void;
    /**
     * Remove from onAfterRender events on threejs objects
     * @link https://threejs.org/docs/#api/en/core/Object3D.onAfterRender
    */
    removeAfterRenderListener(target: Object3D, callback: OnRenderCallback): void;
    private _createRenderCallbackWrapper;
    private _requireDepthTexture;
    private _requireColorTexture;
    private _renderTarget?;
    private _isRendering;
    /** @returns true while the WebGL renderer is rendering (between onBeforeRender and onAfterRender events) */
    get isRendering(): boolean;
    setRequireDepth(val: boolean): void;
    setRequireColor(val: boolean): void;
    get depthTexture(): DepthTexture | null;
    get opaqueColorTexture(): Texture | null;
    /** @returns true if the `<needle-engine>` DOM element is visible on screen (`context.domElement`) */
    get isVisibleToUser(): boolean;
    private _needsVisibleUpdate;
    private _lastStyleComputedResult;
    private _createId;
    private internalOnCreate;
    private readonly rootSceneSourceIdentifiers;
    private internalLoadInitialContent;
    /** Sets the animation loop.
     * Can not be done while creating the context or when disposed
     **/
    restartRenderLoop(): boolean;
    private _renderlooperrors;
    /** Performs a full update step including script callbacks, rendering (unless isManagedExternally is set to false) and post render callbacks */
    update(timestamp: DOMHighResTimeStamp, frame?: XRFrame | null): void;
    /** Call to **manually** perform physics steps.
     * By default the context uses the `physicsSteps` property to perform steps during the update loop
     * If you just want to increase the accuracy of physics you can instead set the `physicsSteps` property to a higher value
     * */
    updatePhysics(steps: number): void;
    /**
     * Set a rect or dom element. The camera center will be moved to the center of the rect.
     * This is useful if you have Needle Engine embedded in a HTML layout and while you want the webgl background to fill e.g. the whole screen you want to move the camera center to free space.
     * For that you can simply pass in the rect or HMTL div that you want the camera to center on.
     * @param rect The focus rect or null to disable
     * @param settings Optional settings for the focus rect. These will override the `focusRectSettings` property
     */
    setCameraFocusRect(rect: FocusRect | null, settings?: Partial<FocusRectSettings>): void;
    get focusRect(): FocusRect | null;
    get focusRectSize(): null | {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Settings when a focus rect is set. Use `setCameraFocusRect(...)` to do so.
     * This can be used to offset the renderer center e.g. to a specific DOM element.
     */
    readonly focusRectSettings: FocusRectSettings;
    private _focusRect;
    private _lastTimestamp;
    private _accumulatedTime;
    private _dispatchReadyAfterFrame;
    private internalStep;
    private internalOnBeforeRender;
    private internalUpdatePhysics;
    private internalOnRender;
    private internalOnAfterRender;
    private readonly _tempClearColor;
    private readonly _tempClearColor2;
    renderNow(camera?: Camera): boolean;
    private _contextRestoreTries;
    private handleRendererContextLost;
    /** returns true if we should return out of the frame loop */
    private _wasPaused;
    private onHandlePaused;
    private evaluatePaused;
    private renderRequiredTextures;
    private executeCoroutines;
}

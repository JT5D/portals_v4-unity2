import { type IComponent, type IContext, type LoadedModel } from "./engine_types.js";

const debug = typeof window !== undefined ? window.location.search.includes("debugcontext") : false;

/** The various events that can be dispatched by a Needle Engine {@link IContext} instance
 */
export enum ContextEvent {
    /** called once when the context is registered to the registry, the context is not fully initialized at this point */
    ContextRegistered = "ContextRegistered",
    /** called before the first glb is loaded, can be used to initialize physics engine, is awaited */
    ContextCreationStart = "ContextCreationStart",
    /** Called when the context content has been created, before the first frame. This callback may be called multiple time during the lifetime of the context, e.g. every time when the context is created and cleared */
    ContextCreated = "ContextCreated",
    /** Called after the first frame has been rendered after creation */
    ContextFirstFrameRendered = "ContextFirstFrameRendered",
    /** Called before the context gets destroyed */
    ContextDestroying = "ContextDestroying",
    /** Called when the context has been destroyed */
    ContextDestroyed = "ContextDestroyed",
    /** Called when the context could not find a camera during creation */
    MissingCamera = "MissingCamera",
    /** Called before the context is being cleared (all objects in the scene are being destroyed and state is reset) */
    ContextClearing = "ContextClearing",
    /** Called after the context has been cleared (all objects in the scene have been destroyed and state has been reset) */
    ContextCleared = "ContextCleared",
}

export type ContextEventArgs = {
    event: ContextEvent;
    context: IContext;
    files?: LoadedModel[]
}

export type ContextCallback = (evt: ContextEventArgs) => void | Promise<any> | IComponent;

/** Use to register to various Needle Engine context events and to get access to all current instances   
 * e.g. when being created in the DOM
 * @example
 * ```typescript
 * import { NeedleEngine } from "./engine/engine_context_registry.js";
 * NeedleEngine.addContextCreatedCallback((evt) => {
 *    console.log("Context created", evt.context);
 * });
 * ```
 * */
export class ContextRegistry {

    /** The currently active (rendering) Needle Engine context */
    static get Current(): IContext {
        return globalThis["NeedleEngine.Context.Current"]
    }
    /** @internal */
    static set Current(ctx: IContext) {
        globalThis["NeedleEngine.Context.Current"] = ctx;
    }

    /** Returns the array of all registered Needle Engine contexts. Do not modify */
    static get All() {
        return this.Registered;
    }

    /** All currently registered Needle Engine contexts. Do not modify */
    static Registered: IContext[] = [];

    /** @internal Internal use only */
    static register(ctx: IContext) {
        if (this.Registered.indexOf(ctx) !== -1) return;
        if (debug) console.warn("Registering context");
        this.Registered.push(ctx);
        this.dispatchCallback(ContextEvent.ContextRegistered, ctx);
    }

    /** @internal Internal use only */
    static unregister(ctx: IContext) {
        const index = this.Registered.indexOf(ctx);
        if (index === -1) return;
        if (debug) console.warn("Unregistering context");
        this.Registered.splice(index, 1);
    }

    private static _callbacks: { [evt: string]: Array<ContextCallback> } = {};

    /**
     * Register a callback to be called when the given event occurs
     */
    static registerCallback(evt: ContextEvent, callback: ContextCallback) {
        if (!this._callbacks[evt]) this._callbacks[evt] = [];
        this._callbacks[evt].push(callback);
    }

    /** Unregister a callback */
    static unregisterCallback(evt: ContextEvent, callback: ContextCallback) {
        if (!this._callbacks[evt]) return;
        const index = this._callbacks[evt].indexOf(callback);
        if (index === -1) return;
        this._callbacks[evt].splice(index, 1);
    }

    /** @internal */
    static dispatchCallback(evt: ContextEvent, context: IContext, extras?: object) {
        if (!this._callbacks[evt]) return true;
        const cbArgs = { event: evt, context }
        if (extras) {
            for (const key in extras) {
                cbArgs[key] = extras[key];
            }
        }
        const promises = new Array<Promise<any>>();
        this._callbacks[evt].forEach(cb => {
            const res = cb(cbArgs)
            if (res instanceof Promise) promises.push(res);
        });
        return Promise.all(promises);
    }

    /**
     * Register a callback to be called when a context is created
     */
    static addContextCreatedCallback(callback: ContextCallback) {
        this.registerCallback(ContextEvent.ContextCreated, callback);
    }
    /**
     * Register a callback to be called when a context is registered
     */
    static addContextDestroyedCallback(callback: ContextCallback) {
        this.registerCallback(ContextEvent.ContextDestroyed, callback);
    }
}

export { ContextRegistry as NeedleEngine };
import { type IComponent } from "./engine_types.js";
type ComponentLifecycleEvent = "component-added" | "removing-component";
export declare class ComponentLifecycleEvents {
    private static eventListeners;
    static addComponentLifecylceEventListener(evt: ComponentLifecycleEvent | (string & {}), cb: (data: IComponent) => void): void;
    static removeComponentLifecylceEventListener(evt: ComponentLifecycleEvent | (string & {}), cb: (data: IComponent) => void): void;
    static dispatchComponentLifecycleEvent(evt: ComponentLifecycleEvent, data: IComponent): void;
}
export {};

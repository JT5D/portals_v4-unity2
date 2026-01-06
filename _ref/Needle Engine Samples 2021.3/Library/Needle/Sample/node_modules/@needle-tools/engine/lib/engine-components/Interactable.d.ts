import { Behaviour } from "./Component.js";
/**
 * Marks an object as currently being interacted with.
 * For example, DragControls set this on the dragged object to prevent DeleteBox from deleting it.
 */
export declare class UsageMarker extends Behaviour {
    isUsed: boolean;
    usedBy: any;
}
/**
 * An empty component that can be used to mark an object as interactable.
 * @group Components
 */
/** @deprecated */
export declare class Interactable extends Behaviour {
}

import { Behaviour } from "./Component.js";

/**
 * Marks an object as currently being interacted with.
 * For example, DragControls set this on the dragged object to prevent DeleteBox from deleting it.
 */
export class UsageMarker extends Behaviour
{
    public isUsed: boolean = true;
    public usedBy: any = null;
}

/**
 * An empty component that can be used to mark an object as interactable.
 * @group Components
 */
/** @deprecated */
export class Interactable extends Behaviour {}
import { Behaviour } from "../Component.js";
import type { XRControllerMovement } from "./controllers/XRControllerMovement.js";

/** 
 * This component is just used as a marker on objects for WebXR teleportation  
 * The {@link XRControllerMovement} component can be configured to check if the TeleportTarget component is present on an object to allow teleporting to that object.
 * 
 * @category XR
 * @group Components
 */
export class TeleportTarget extends Behaviour {

}

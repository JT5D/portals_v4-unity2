import type { KeyCode } from "../engine/engine_input.js";
import { Behaviour } from "../engine-components/Component.js";
/** @internal */
export declare class PresentationMode extends Behaviour {
    toggleKey: KeyCode;
    update(): void;
}

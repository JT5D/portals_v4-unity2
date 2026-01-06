import { AnimationAction, AnimationClip, AnimationMixer } from "three";
import { Context } from "../engine/engine_setup.js";
import type { AnimatorControllerModel, State } from "../engine/extensions/NEEDLE_animator_controller_model.js";
import { AnimatorStateInfo } from "../engine/extensions/NEEDLE_animator_controller_model.js";
import { Animator } from "./Animator.js";
/**
 * Configuration options for creating an AnimatorController
 */
declare type CreateAnimatorControllerOptions = {
    /** Should each animation state loop */
    looping?: boolean;
    /** Set to false to disable generating transitions between animation clips */
    autoTransition?: boolean;
    /** Duration in seconds for transitions between states */
    transitionDuration?: number;
};
/**
 * Controls the playback of animations using a state machine architecture.
 *
 * The AnimatorController manages animation states, transitions between states,
 * and parameters that affect those transitions. It is used by the {@link Animator}
 * component to control animation behavior on 3D models.
 *
 * Use the static method {@link AnimatorController.createFromClips} to create
 * an animator controller from a set of animation clips.
 *
 * @category Animation and Sequencing
 * @group Utilities
 */
export declare class AnimatorController {
    /**
     * Creates an AnimatorController from a set of animation clips.
     * Each clip becomes a state in the controller's state machine.
     *
     * @param clips - The animation clips to use for creating states
     * @param options - Configuration options for the controller including looping behavior and transitions
     * @returns A new AnimatorController instance
     */
    static createFromClips(clips: AnimationClip[], options?: CreateAnimatorControllerOptions): AnimatorController;
    /**
     * Plays an animation state by name or hash.
     *
     * @param name - The name or hash identifier of the state to play
     * @param layerIndex - The layer index (defaults to 0)
     * @param normalizedTime - The normalized time to start the animation from (0-1)
     * @param durationInSec - Transition duration in seconds
     */
    play(name: string | number, layerIndex?: number, normalizedTime?: number, durationInSec?: number): void;
    /**
     * Resets the controller to its initial state.
     */
    reset(): void;
    /**
     * Sets a boolean parameter value by name or hash.
     *
     * @param name - The name or hash identifier of the parameter
     * @param value - The boolean value to set
     */
    setBool(name: string | number, value: boolean): void;
    /**
     * Gets a boolean parameter value by name or hash.
     *
     * @param name - The name or hash identifier of the parameter
     * @returns The boolean value of the parameter, or false if not found
     */
    getBool(name: string | number): boolean;
    /**
     * Sets a float parameter value by name or hash.
     *
     * @param name - The name or hash identifier of the parameter
     * @param val - The float value to set
     * @returns True if the parameter was found and set, false otherwise
     */
    setFloat(name: string | number, val: number): boolean;
    /**
     * Gets a float parameter value by name or hash.
     *
     * @param name - The name or hash identifier of the parameter
     * @returns The float value of the parameter, or 0 if not found
     */
    getFloat(name: string | number): number;
    /**
     * Sets an integer parameter value by name or hash.
     *
     * @param name - The name or hash identifier of the parameter
     * @param val - The integer value to set
     */
    setInteger(name: string | number, val: number): void;
    /**
     * Gets an integer parameter value by name or hash.
     *
     * @param name - The name or hash identifier of the parameter
     * @returns The integer value of the parameter, or 0 if not found
     */
    getInteger(name: string | number): number;
    /**
     * Sets a trigger parameter to active (true).
     * Trigger parameters are automatically reset after they are consumed by a transition.
     *
     * @param name - The name or hash identifier of the trigger parameter
     */
    setTrigger(name: string | number): void;
    /**
     * Resets a trigger parameter to inactive (false).
     *
     * @param name - The name or hash identifier of the trigger parameter
     */
    resetTrigger(name: string | number): void;
    /**
     * Gets the current state of a trigger parameter.
     *
     * @param name - The name or hash identifier of the trigger parameter
     * @returns The boolean state of the trigger, or false if not found
     */
    getTrigger(name: string | number): boolean;
    /**
     * Checks if the controller is currently in a transition between states.
     *
     * @returns True if a transition is in progress, false otherwise
     */
    isInTransition(): boolean;
    /** Set the speed of the animator controller. Larger values will make the animation play faster. */
    setSpeed(speed: number): void;
    private _speed;
    /**
     * Finds an animation state by name or hash.
     * @deprecated Use findState instead
     *
     * @param name - The name or hash identifier of the state to find
     * @returns The found state or null if not found
     */
    FindState(name: string | number | undefined | null): State | null;
    /**
     * Finds an animation state by name or hash.
     *
     * @param name - The name or hash identifier of the state to find
     * @returns The found state or null if not found
     */
    findState(name: string | number | undefined | null): State | null;
    /**
     * Gets information about the current playing animation state.
     *
     * @returns An AnimatorStateInfo object with data about the current state, or null if no state is active
     */
    getCurrentStateInfo(): AnimatorStateInfo | null;
    /**
     * Gets the animation action currently playing.
     *
     * @returns The current animation action, or null if no action is playing
     */
    get currentAction(): AnimationAction | null;
    /**
     * The normalized time (0-1) to start playing the first state at.
     * This affects the initial state when the animator is first enabled.
     */
    normalizedStartOffset: number;
    /**
     * The Animator component this controller is bound to.
     */
    animator?: Animator;
    /**
     * The data model describing the animation states and transitions.
     */
    model: AnimatorControllerModel;
    /**
     * Gets the engine context from the bound animator.
     */
    get context(): Context | undefined | null;
    /**
     * Gets the animation mixer used by this controller.
     */
    get mixer(): AnimationMixer;
    /**
     * Cleans up resources used by this controller.
     * Stops all animations and unregisters the mixer from the animation system.
     */
    dispose(): void;
    /**
     * Binds this controller to an animator component.
     * Creates a new animation mixer and sets up animation actions.
     *
     * @param animator - The animator to bind this controller to
     */
    bind(animator: Animator): void;
    /**
     * Creates a deep copy of this controller.
     * Clones the model data but does not copy runtime state.
     *
     * @returns A new AnimatorController instance with the same configuration
     */
    clone(): AnimatorController | null;
    /**
     * Updates the controller's state machine and animations.
     * Called each frame by the animator component.
     *
     * @param weight - The weight to apply to the animations (for blending)
     */
    update(weight: number): void;
    private _mixer;
    private _activeState?;
    /**
     * Gets the currently active animation state.
     *
     * @returns The active state or undefined if no state is active
     */
    get activeState(): State | undefined;
    constructor(model: AnimatorControllerModel);
    private _activeStates;
    private updateActiveStates;
    private setStartTransition;
    private evaluateTransitions;
    private setTimescale;
    private getState;
    /**
     * These actions have been active previously but not faded out because we entered a state that has no real animation - no duration. In which case we hold the previously active actions until they are faded out.
     */
    private readonly _heldActions;
    private releaseHeldActions;
    private transitionTo;
    private createAction;
    private evaluateCondition;
    private createActions;
    /**
     * Yields all animation actions managed by this controller.
     * Iterates through all states in all layers and returns their actions.
     */
    enumerateActions(): Generator<AnimationAction, void, unknown>;
    private rootMotionHandler?;
}
export {};

import { type ITime } from './engine_types.js';
/**
 * Time is a class that provides time-related information.
 * It is created and used within the Needle Engine Context.
 */
export declare class Time implements ITime {
    /** The time in seconds since the start of Needle Engine. */
    get time(): number;
    private set time(value);
    private _time;
    /** The time in seconds it took to complete the last frame (Read Only). */
    get deltaTime(): number;
    private set deltaTime(value);
    private _deltaTime;
    /** The time in seconds it took to complete the last frame (Read Only). Timescale is not applied. */
    get deltaTimeUnscaled(): number;
    private _deltaTimeUnscaled;
    /** The scale at which time passes. This can be used for slow motion effects or to speed up time. */
    timeScale: number;
    /** same as frameCount */
    get frame(): number;
    private set frame(value);
    private _frame;
    /** The total number of frames that have passed (Read Only). Same as frame */
    get frameCount(): number;
    /** The time in seconds it took to complete the last frame (Read Only). */
    get realtimeSinceStartup(): number;
    /**
     * @returns {Number} FPS for this frame.
     * Note that this returns the raw value (e.g. 59.88023952362959) and will fluctuate a lot between frames.
     * If you want a more stable FPS, use `smoothedFps` instead.
    */
    get fps(): number;
    /**
     * Approximated frames per second
     * @returns the smoothed FPS value over the last 60 frames with decimals.
    */
    get smoothedFps(): number;
    /** The smoothed time in seconds it took to complete the last frame (Read Only). */
    get smoothedDeltaTime(): number;
    private clock;
    private _smoothedFps;
    private _smoothedDeltaTime;
    private readonly _fpsSamples;
    private _fpsSampleIndex;
    constructor();
    /** Step the time. This is called automatically by the Needle Engine Context.
     * @internal
     */
    update(): void;
}

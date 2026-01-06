import { Color } from "three";
import { Mathf } from "../../engine/engine_math.js";
/**
 * RGBAColor is a class that represents a color with red, green, blue and alpha components.
 */
export class RGBAColor extends Color {
    alpha = 1;
    get isRGBAColor() { return true; }
    set a(val) { this.alpha = val; }
    get a() { return this.alpha; }
    constructor(r, g, b, a) {
        // AMD compilation creates recursive super calls with local function wrappers
        // Call super() first with the minimum arguments needed
        super();
        if (typeof r === "number" && typeof g === "number" && typeof b === "number") {
            this.set(r, g, b);
            this.alpha = typeof a === "number" ? a : 1;
        }
        else if (r !== undefined) {
            this.set(r);
            this.alpha = 1;
        }
    }
    clone() {
        const cloned = super.clone();
        cloned.alpha = this.alpha;
        return cloned;
    }
    copy(col) {
        this.r = col.r;
        this.g = col.g;
        this.b = col.b;
        if ("alpha" in col && typeof col.alpha === "number") {
            this.alpha = col.alpha;
        }
        else if (typeof col["a"] === "number")
            this.alpha = col["a"];
        return this;
    }
    lerp(color, alpha) {
        const rgba = color;
        if (rgba.alpha != undefined)
            this.alpha = Mathf.lerp(this.alpha, rgba.alpha, alpha);
        return super.lerp(color, alpha);
    }
    lerpColors(color1, color2, alpha) {
        const rgba1 = color1;
        const rgba2 = color2;
        if (rgba1.alpha != undefined && rgba2.alpha != undefined)
            this.alpha = Mathf.lerp(rgba1.alpha, rgba2.alpha, alpha);
        return super.lerpColors(color1, color2, alpha);
    }
    multiply(color) {
        const rgba = color;
        if (rgba.alpha != undefined)
            this.alpha = this.alpha * rgba.alpha;
        return super.multiply(color);
    }
    fromArray(array, offset = 0) {
        this.alpha = array[offset + 3];
        return super.fromArray(array, offset);
    }
    static fromColorRepresentation(col) {
        if (typeof col === "string") {
            if (col.trim() === "transparent") {
                return new RGBAColor(0, 0, 0, 0);
            }
            // handle hex colors with alpha
            if (col.startsWith("#") && col.length === 9) {
                const hex = parseInt(col.slice(1, 9), 16);
                const r = (hex >> 24) & 0xff;
                const g = (hex >> 16) & 0xff;
                const b = (hex >> 8) & 0xff;
                const a = (hex >> 0) & 0xff;
                return new RGBAColor(r / 255, g / 255, b / 255, a / 255);
            }
            // handle hex colors
            else if (col.startsWith("#")) {
                const hex = parseInt(col.slice(1), 16);
                const r = (hex >> 16) & 0xff;
                const g = (hex >> 8) & 0xff;
                const b = (hex >> 0) & 0xff;
                return new RGBAColor(r / 255, g / 255, b / 255, 1);
            }
            // handle rgba string
            else if (col.startsWith("rgba")) {
                const rgba = col.slice(5, -1).split(",").map(Number);
                return new RGBAColor(rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]);
            }
            // handle rgb string
            else if (col.startsWith("rgb")) {
                const rgb = col.slice(4, -1).split(",").map(Number);
                return new RGBAColor(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1);
            }
        }
        else if (Array.isArray(col)) {
            // handle rgba colors
            if (col.length === 4) {
                return new RGBAColor(col[0], col[1], col[2], col[3]);
            }
            // handle rgb colors
            else if (col.length === 3) {
                return new RGBAColor(col[0], col[1], col[2], 1);
            }
            else {
                console.error("Invalid color array length. Expected 3 or 4, got " + col.length);
            }
        }
        return new RGBAColor(col);
    }
}
//# sourceMappingURL=RGBAColor.js.map
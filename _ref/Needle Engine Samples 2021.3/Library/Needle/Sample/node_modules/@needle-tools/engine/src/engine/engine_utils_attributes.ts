

/**
 * @internal
 */
export namespace InternalAttributeUtils {

    /**
     * Checks if the given value is considered "falsey" in the context of HTML attributes.
     * A value is considered falsey if it is "0" or "false" (case-insensitive).
     *
     * @param value - The attribute value to check.
     * @returns True if the value is falsey, otherwise false.
     */
    export function isFalsey(value: string | null): boolean {
        return value === "0" || value?.toLowerCase() === "false";
    }

    /**
     * Retrieves the value of the specified attribute from the given element.
     * If the attribute value is considered falsey, it returns null.
     * @returns The attribute value or null if falsey.
     */
    export function getAttributeValueIfNotFalsey(element: Element, attributeName: string, opts?: { onAttribute: (value: string) => void }): string | null {
        const attrValue = element.getAttribute(attributeName);
        if (isFalsey(attrValue)) {
            return null;
        }
        opts?.onAttribute?.call(null, attrValue!);
        return attrValue;
    }

    /**
     * Retrieves the value of the specified attribute from the given element.
     * If the attribute value is considered falsey, it returns false.
     * If the attribute is not set at all, it returns null.
     * @returns The attribute value, false if falsey, or null if not set.
     * 
     * @example
     * ```typescript
     * const result = HTMLAttributeUtils.getAttributeAndCheckFalsey(element, 'data-example', {
     *     onAttribute: (value, falsey) => {
     *         console.log(`Attribute value: ${value}
     * , Is falsey: ${falsey}`);
     *     }
     * });
     * 
     * if (result === false) {
     *     console.log('The attribute is set to a falsey value.');
     * } else if (result === null) {
     *     console.log('The attribute is not set.');
     * } else {
     *     console.log(`The attribute value is: ${result}`);
     * }
     * ```
     */
    export function getAttributeAndCheckFalsey(element: Element, attributeName: string, opts?: { onAttribute: (value: string, falsey:boolean) => void }): false | string | null {
        const attrValue = element.getAttribute(attributeName);
        // If the attribute is not set at all we just return
        if(attrValue === null) {
            return null;
        }
        if (isFalsey(attrValue)) {
            opts?.onAttribute?.call(null, attrValue!, true);
            return false;
        }
        opts?.onAttribute?.call(null, attrValue!, false);
        return attrValue;
    }

}




// https://regex101.com/r/SVhzzD/1
// @ts-ignore
const needleEngineRegex = /<needle-engine.*?src=["'](?<src>[\w\d]+?)["']>/gm;


/**
 * @param {string} html
 * @returns {string[]} urls
 */
export function tryParseNeedleEngineSrcAttributeFromHtml(html) {
    const needleEngineMatches = html.matchAll(needleEngineRegex);
    
    /**
     * @type {string[]}
     */
    const results = [];

    if (needleEngineMatches) {
        while (true) {
            const match = needleEngineMatches.next();
            if (match.done) break;
            /** @type {undefined | null | string} */
            const value = match.value?.groups?.src;
            if (value) {
                if (value.startsWith("[")) {
                    // we have an array assigned
                    const arr = JSON.parse(value);
                    for (const item of arr) {
                        results.push(item);
                    }
                }
                else {
                    results.push(value);
                }
            }
        }
    }
    return results;
}
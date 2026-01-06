const peerjsString = `/* needle: fix for peerjs */ window.global = window; var parcelRequire;`

/**
 * @param {import('../types').userSettings} userSettings
 * @returns {import("vite").Plugin | undefined}
 */
export const needlePeerjs = (command, config, userSettings) => {

    if (userSettings.noPeer === true) return;

    return {
        name: 'needle:peerjs',
        enforce: "pre",
        transformIndexHtml: {
            order: 'pre',
            handler(html, _ctx) {
                return {
                    html,
                    tags: [
                        {
                            tag: 'script',
                            children: peerjsString,
                            injectTo: 'body-prepend',
                        },
                    ]
                }
            },
        },
        transform: (code, id) => {
            return patchWebRTCAdapterForGemini(code, id);
        }
    }
}



/**
 * @param {string} code
 * @param {string} id
 * @returns {string | undefined}
 */
function patchWebRTCAdapterForGemini(code, id) {
    // Match navigator.mediaDevices.getUserMedia assignments
    const assignmentRegex = /(navigator\d{0,1})\.mediaDevices\.getUserMedia\s*=\s*function/gm;

    let didTransform = false;
    let transformedCode = code;
    let match;

    while ((match = assignmentRegex.exec(code)) !== null) {
        const navigatorRef = match[1];
        const matchStart = match.index;

        // Find the end of the function assignment
        let braceCount = 0;
        let inFunction = false;
        let endIndex = matchStart;

        for (let i = matchStart; i < code.length; i++) {
            const char = code[i];
            if (char === '{') {
                braceCount++;
                inFunction = true;
            } else if (char === '}') {
                braceCount--;
                if (inFunction && braceCount === 0) {
                    endIndex = i + 1;
                    break;
                }
            }
        }

        const originalAssignment = code.substring(matchStart, endIndex);
        const wrappedAssignment = `if (Object.getOwnPropertyDescriptor(${navigatorRef}.mediaDevices, "getUserMedia")?.writable) {\n    ${originalAssignment}\n}`;
        didTransform = true;
        transformedCode = transformedCode.replace(originalAssignment, wrappedAssignment);
        // console.log("-------------------------------\nTRANSFORMED\n", id, "\nOriginal:", originalAssignment, "\nWrapped:", wrappedAssignment, "\n\n");
    }

    if(!didTransform) return undefined;

    if(!didLog) {
        console.log("[needle:peerjs] Fixed WebRTC assignment");
        didLog = true;
    }

    return transformedCode;

}

let didLog = false;
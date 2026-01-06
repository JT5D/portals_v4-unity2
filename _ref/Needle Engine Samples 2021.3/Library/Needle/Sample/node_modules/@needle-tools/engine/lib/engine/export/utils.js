import { HideFlags } from "../engine_types.js";
export function shouldExport_HideFlags(obj) {
    const dontExport = HideFlags.DontExport;
    if (obj.hideFlags & dontExport)
        return false;
    return true;
}
//# sourceMappingURL=utils.js.map
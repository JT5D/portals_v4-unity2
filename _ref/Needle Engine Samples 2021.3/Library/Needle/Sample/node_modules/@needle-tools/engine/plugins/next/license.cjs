const { getMeta } = require("../common/config.cjs");

const mod = import("../common/license.js");

module.exports = async function (source, _map) {

    /** @ts-ignore */
    const options = this.getOptions();

    /** @type {string | undefined} */
    let team = options.team;

    if (!team) {
        const meta = await getMeta();
        if (meta) {
            team = meta.license?.team;
        }
    }

    // console.log("RESOLVE LICENSE...");
    return (await mod).replaceLicense(source, {
        accessToken: options.accessToken,
        team: team,
    });
};
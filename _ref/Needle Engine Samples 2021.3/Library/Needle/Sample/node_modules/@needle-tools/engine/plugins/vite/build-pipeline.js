import { ChildProcess, exec } from 'child_process';
import { NEEDLE_CLOUD_CLI_NAME } from '../common/cloud.js';
import { getOutputDirectory, loadConfig } from './config.js';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { copyFilesSync } from '../common/files.js';
import { delay } from '../common/timers.js';

/**
 * @param {import('../types').userSettings} config
 * @returns {boolean}
 */
function validateCloudBuildConfiguration(config) {
    if (config.buildPipeline != undefined) {
        if (process.env.CI) {
            if ((process.env.NEEDLE_CLOUD_TOKEN == undefined || process.env.NEEDLE_CLOUD_TOKEN.length <= 0)) {
                const isGithubAction = process.env.CI && process.env.GITHUB_ACTION;
                let msg = `Missing Needle Cloud access token. Please set your Needle Cloud token via \`process.env.NEEDLE_CLOUD_TOKEN\`.`;
                if (isGithubAction) {
                    msg += `
Make sure to pass the token as a secret to the Github action. 
For this you may have to modify your .github workflow yaml file to include the following code:
env:
- NEEDLE_CLOUD_TOKEN: \${{ secrets.NEEDLE_CLOUD_TOKEN }}
`;
                    let error = `${msg}`;
                    throw new Error(error);
                }
            }
        }
    }

    return true;
}

// see https://linear.app/needle/issue/NE-3798


/**  @type {Promise<any>|null} */
let buildPipelineTask;
/** @type {null | {tempDirectory:string, outputDirectory:string}} */
let buildPipelineTaskResults = null;

export function waitForBuildPipelineToFinish() {
    return buildPipelineTask;
}

/** This time is set when a build plugin is triggered to run
 * We increase the time by 10-20 seconds each time because we might have a multi step process 
 * where the build pipeline is triggered in the SSR build (which we can not always detect)
 * and the final client build is triggered later (but the build pipeline is still running and waiting)
 */
let maxOutputDirectoryCreatedWaitTime = 0;

let defaultWaitTime = 60_000; // 60 seconds

/**
 * @param {boolean} debugLog
 */
function increaseMaxWaitTime(debugLog) {
    maxOutputDirectoryCreatedWaitTime = Date.now();
    let maxAdditionalWaitTime = defaultWaitTime;
    if (process.env.CI) {
        maxAdditionalWaitTime += 60_000;
    }
    maxOutputDirectoryCreatedWaitTime += maxAdditionalWaitTime;
    if (debugLog) {
        log(`Increased max wait time by ${maxAdditionalWaitTime / 1000}sec until ${new Date(maxOutputDirectoryCreatedWaitTime).toISOString()}`);
    }
}

/**
 * Runs the needle build pipeline as part of the vite build process
 * @param {string} command
 * @param {import('vite').UserConfig} config
 * @param {import('../types').userSettings} userSettings
 * @returns {Promise<import('vite').Plugin | null>}
 */
export const needleBuildPipeline = async (command, config, userSettings) => {

    // we only want to run compression here if this is a distribution build
    // this is handled however in the `apply` hook
    if (userSettings.noBuildPipeline) return null;
    if (userSettings.buildPipeline?.enabled === false) {
        log("Skipping build pipeline because it is disabled in the user settings via `buildPipeline.enabled: false`");
        return null;
    }

    const packageJsonPath = process.cwd() + "/package.json";
    await fixPackageJson(packageJsonPath);

    if(userSettings.buildPipeline?.maxWaitDuration !== undefined && typeof userSettings.buildPipeline?.maxWaitDuration === "number" && userSettings.buildPipeline?.maxWaitDuration >= 0) {
        log(`Set timeout to ${userSettings.buildPipeline?.maxWaitDuration}ms as defined in your config`);
        defaultWaitTime = userSettings.buildPipeline?.maxWaitDuration;
    }

    let shouldRun = false;
    const productionArgument = process.argv.indexOf("--production");
    if (productionArgument >= 0) {
        shouldRun = true;
    }

    if (!shouldRun) {
        log("Skipping build pipeline because this is a development build.\n- Invoke with `--production` to run the build pipeline.\n- For example \"vite build -- --production\".");
        await new Promise((resolve, _) => setTimeout(resolve, 1000));
        return null;
    }

    if (process.env.CI) {
        log("Running in CI environment");
    }

    validateCloudBuildConfiguration(userSettings);

    const verboseOutput = userSettings?.buildPipeline?.verbose || false;
    let taskHasCompleted = false;

    return {
        name: 'needle:buildpipeline',
        enforce: "post",
        apply: (_conf, env) => {
            if (verboseOutput) {
                log("Apply:", env);
            }
            // Don't run for SSR builds (e.g. sveltekit). 
            // Unfortunately this is always falls in vite 4.3 so we can not rely on it solely
            if (env.ssrBuild) return false;
            // Dont run if there's already a build pipeline task running
            if (env.command === "build") {
                increaseMaxWaitTime(verboseOutput);
                if (buildPipelineTask) {
                    return false;
                }
                return true;
            }
            return false;
        },
        buildEnd(error) {
            increaseMaxWaitTime(verboseOutput);

            if (verboseOutput) {
                log("Build end:", error ?? "No error");
            }
            if (error) {
                // if there was an error during the build we should not run the build pipeline
            }
            else {
                if (buildPipelineTask) {
                    log("Build pipeline already running...");
                    return;
                }
                let taskSucceeded = false;
                // start the compression process once vite is done copying the files
                buildPipelineTask = invokeBuildPipeline(userSettings, { verbose: verboseOutput })
                    .then((res) => {
                        if (verboseOutput) log("Build pipeline task result:", res);
                        taskSucceeded = res;
                    })
                    .catch(err => {
                        console.error("[needle-buildpipeline] - Error during build pipeline: " + err.message);
                        if (verboseOutput) log("Error details:", err);
                    })
                    .finally(() => {
                        taskHasCompleted = true;
                        if (!taskSucceeded) {
                            console.error("[needle-buildpipeline] - Build pipeline task did not succeed.");
                            throw new Error("[needle-buildpipeline] - Build pipeline failed. Please check the logs above for more information.");
                        }
                        else {
                            log("Finished successfully");
                        }
                    });
            }
        },
        closeBundle() {
            if (!buildPipelineTask) {
                return;
            }
            if (!taskHasCompleted) {
                log("Waiting for build pipeline to finish...");
            }
            // // this is the last hook that is called, so we can wait for the task to finish here
            return buildPipelineTask = buildPipelineTask?.then(() => {
                // Copy the results to their final output directory. 
                if (buildPipelineTaskResults != null) {
                    log(`Copying files from temporary output directory to final output directory at \"${buildPipelineTaskResults.outputDirectory}\"`);
                    const ctx = { count: 0 }
                    copyFilesSync(buildPipelineTaskResults.tempDirectory, buildPipelineTaskResults.outputDirectory, true, ctx);
                    log(`Copied ${ctx.count} file(s)`);
                }
                else {
                    log("No files to copy - build pipeline did not run or did not finish successfully");
                }
            });
        },
    }
}


/**
 * Previously we did always install the build pipeline and run an extra command to invoke the build pipeline.  
 * This is now done automatically by the needle build pipeline plugin - so we update all legacy projects to use the new method.
 * @param {string} packageJsonPath
 */
async function fixPackageJson(packageJsonPath) {
    if (!existsSync(packageJsonPath)) {
        return;
    }
    const text = readFileSync(packageJsonPath, "utf8");
    const oldScript = `"build:production": "npm run build:dev && npm run gltf:transform"`;
    const newScript = `"build:production": "vite build -- --production"`;
    const fixed = text.replace(oldScript, newScript);
    if (fixed === text) return;
    log("Automatically updated package.json production build script");
    log("- FROM " + oldScript);
    log("- TO " + newScript);
    writeFileSync(packageJsonPath, fixed);
}

/** @param {any} args */
function log(...args) {
    console.log("[needle-buildpipeline]", ...args);
}
/** @param {any} args */
function warn(...args) {
    console.warn("WARN: [needle-buildpipeline]", ...args);
}

/**
 * @param {import('../types').userSettings} opts 
 * @param {{verbose?:boolean}} [options]
 * @returns {Promise<boolean>}
 */
async function invokeBuildPipeline(opts, options = {}) {
    const installPath = "node_modules/@needle-tools/gltf-build-pipeline";
    const fullInstallPath = process.cwd() + "/" + installPath;
    const existsLocally = existsSync(fullInstallPath);
    if (existsLocally) {
        log("Found local installation at " + fullInstallPath);
    }
    await delay(500);
    const outputDirectory = getOutputDirectory() + "/assets";
    const startWaitTime = Date.now();
    const maxEndTime = startWaitTime + 300_000;
    /** wait until the output directory exists
     * @param {number} iteration
     * @returns {Promise<boolean>}
     */
    function waitForOutputDirectory(iteration) {
        // we wait for the output directory
        if (!existsSync(outputDirectory)) {
            if (maxOutputDirectoryCreatedWaitTime != 0 && Date.now() > maxOutputDirectoryCreatedWaitTime) {
                const waitDuration = (Date.now() - startWaitTime) / 1000;
                log(`Aborting after ${waitDuration} seconds... Your website bundling process did take longer than expected. Try increasing the timeout via the \`buildPipeline.timeoutDuration\` setting in your vite.config.js (default is 60 seconds).`);
                return Promise.resolve(false);
            }
            else if (Date.now() > maxEndTime) {
                log("Max wait time exceeded - aborting...");
                return Promise.resolve(false);
            }
            if (iteration <= 0) log(`Waiting for output directory to be created... (${outputDirectory})`);
            return delay(1000).then(() => waitForOutputDirectory(iteration + 1));
        }
        if (options?.verbose) log(`Output directory found after ${iteration} iteration(s) at "${outputDirectory}" - continuing...`);
        return Promise.resolve(true);
    }
    if (!await waitForOutputDirectory(0)) {
        warn(`Output directory not found/created at \"${outputDirectory}\" - aborting...`);
        return false;
    }
    const files = readdirSync(outputDirectory).filter(f => f.endsWith(".glb") || f.endsWith(".gltf") || f.endsWith(".vrm") || f.endsWith(".fbx"));
    log(`${files.length} file(s) to process in ${outputDirectory}`);

    /** @type {null | ChildProcess} */
    let proc = null;

    let cloudAccessToken = opts.buildPipeline?.accessToken || opts.license?.accessToken;
    if (!cloudAccessToken) {
        cloudAccessToken = process.env.NEEDLE_CLOUD_TOKEN;
    }
    const runInCloud = typeof cloudAccessToken === "string" && cloudAccessToken.length > 0;
    // if a user has defined the build pipeline settings object but not passed in a token we should print out some information 
    // or perhaps log an error / prevent the build from running completely
    if (opts.buildPipeline && !runInCloud && process.env.CI) {
        warn(`No cloud access token found. Please set it via process.env.NEEDLE_CLOUD_TOKEN`);
        return false;
    }


    // put the processed files first in a temporary directory. They will be moved to the output directory at the end of the buildstep
    // this is so that processes like sveltekit-static-adapter can run first and does not override already compressed files
    const tempOutputPath = process.cwd() + "/node_modules/.needle/build-pipeline/output";
    if (existsSync(tempOutputPath)) {
        log("Removing temporary output directory at " + tempOutputPath);
        rmSync(tempOutputPath, { recursive: true, force: true });
    }
    mkdirSync(tempOutputPath, { recursive: true });

    /** @param {number} code */
    function onExit(code) {
        if (code === 0) {
            buildPipelineTaskResults = {
                tempDirectory: tempOutputPath,
                outputDirectory: outputDirectory
            }
        }
    }

    // allow running the build pipeline in the cloud. It requires and access token to be set in the vite.config.js
    // this can be set via e.g. process.env.NEEDLE_CLOUD_TOKEN
    if (runInCloud) {
        if (!cloudAccessToken || !(typeof cloudAccessToken === "string") || cloudAccessToken.length <= 0) {
            throw new Error("No cloud access token configured. Please set it via process.env.NEEDLE_CLOUD_TOKEN or in the vite.config.js");
        }
        let cmd = `npx --yes ${NEEDLE_CLOUD_CLI_NAME} optimize "${outputDirectory}" --token ${cloudAccessToken}`;
        let projectName = opts.buildPipeline?.projectName;
        // Default project name for compression
        // TODO: maybe this should be taken from the package.json name field or needle.config?
        if (!projectName) {
            projectName = "compression";
        }
        if (projectName) {
            cmd += ` --name "${projectName}"`;
        }
        if (opts.buildPipeline?.verbose === true) {
            cmd += " --verbose";
        }
        cmd += " --outdir \"" + tempOutputPath + "\"";
        console.log("\n");
        const obfuscatedToken = `${cloudAccessToken.slice(0, 2)}*****${cloudAccessToken.slice(-2)}`;
        log(`Running compression in cloud ⛅ using access token: ${obfuscatedToken}`);
        proc = exec(cmd);
    }
    else if (existsLocally) {
        const cmd = `needle-gltf transform "${outputDirectory}" \"${tempOutputPath}\"`;
        log("Running command \"" + cmd + "\" at " + process.cwd() + "...");
        proc = exec(cmd, { cwd: installPath });
    }
    else {
        const version = opts.buildPipeline?.version || "stable";
        const cmd = `npx --yes @needle-tools/gltf-build-pipeline@${version} transform "${outputDirectory}" \"${tempOutputPath}\"`;
        log(`Running compression locally using version '${version}'`);
        proc = exec(cmd);
    }
    /** @param {any} data */
    function onLog(data) {
        if (data.length <= 0) return;
        // ensure that it doesnt end with a newline
        while (data.endsWith("\n")) data = data.slice(0, -1);
        if (typeof data === "string") {
            if (data.startsWith("ERR:")) {
                console.error(data);
                return;
            }
            else if (data.startsWith("WARN:")) {
                console.warn(data);
                return;
            }
            // Ignore empty lines
            else if (data.trim().length <= 0) {
                return;
            }
        }
        log(data);
    }
    proc.stdout?.on('data', onLog);
    proc.stderr?.on('data', onLog);
    return new Promise((resolve, reject) => {
        proc.on('exit', (code) => {
            if (code === null || code === undefined) {
                if (options?.verbose) log("Process exited with no code - assuming success");
                code = 0;
            }
            const success = code === 0;
            if (!success) log(`Process failed with exit code ${code}`);
            onExit(code || 0);
            resolve(success);
        });
    });
}

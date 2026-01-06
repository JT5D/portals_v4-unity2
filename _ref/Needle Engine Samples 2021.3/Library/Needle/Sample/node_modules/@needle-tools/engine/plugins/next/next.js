import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { tryGetNeedleEngineVersion } from '../common/version.js';
import { tryGetGenerator } from '../common/generator.js';
import { getConfig, getMeta } from '../common/config.cjs';
import { alias } from './alias.cjs';
import { createBuildInfoFile } from '../common/buildinfo.js';
import { getPublicIdentifier } from '../common/license.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/** Pass a nextConfig object in to add the needle specific settings. 
 * Optionally omit nextConfig and it will be created for you.
 * @param {import('next').NextConfig} nextConfig
 * @param {import('../types').userSettings} userSettings
 * @returns {import('next').NextConfig}
 */
export const needleNext = async (nextConfig, userSettings) => {
    console.log("Apply 🌵 needle next config");

    if (!nextConfig) {
        nextConfig = {
            reactStrictMode: true,
        };
    }

    const needleConfig = getConfig();

    // add transpile packages
    if (!nextConfig.transpilePackages) {
        nextConfig.transpilePackages = [];
    }
    nextConfig.transpilePackages.push("three", "peerjs", "three-mesh-ui");

    if (nextConfig.output === undefined) {
        console.log("Set output to 'export' (see 'https://nextjs.org/docs/pages/building-your-application/deploying/static-exports#configuration' for more information)");
        nextConfig.output = "export";
        // we *also* need to turn OFF image optimization for static HTML files to be generated
        // see https://github.com/vercel/next.js/issues/40240
        if (nextConfig.images === undefined) {
            nextConfig.images = {
                unoptimized: true
            }
        }
    }
    if (nextConfig.distDir == undefined) {
        console.log("Export to 'dist'");
        if (needleConfig?.buildDirectory) {
            console.log(`Using build directory from needle config: ${needleConfig.buildDirectory}`);
            nextConfig.distDir = needleConfig.buildDirectory;
        }
        else {
            console.log("Using default build directory 'dist'. You can override the output directory via the needle config or by setting nextConfig.distDir");
            nextConfig.distDir = "dist";
        }
    }

    const projectId = await getPublicIdentifier(undefined).catch(e => { /*ignore*/ })

    // add webpack config
    if (!nextConfig.webpack) nextConfig.webpack = nextWebPack;
    else {
        const webpackFn = nextConfig.webpack;
        nextConfig.webpack = (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
            nextWebPack(config, { buildId, dev, isServer, defaultLoaders, webpack });
            return webpackFn(config, { buildId, dev, isServer, defaultLoaders, webpack });
        }
    }
    /** @param {import ('next').NextConfig config } */
    function nextWebPack(config, { buildId, dev, isServer, defaultLoaders, webpack }) {

        // TODO: get public identifier key from license server

        const meta = getMeta();
        let useRapier = true;
        if (userSettings.useRapier === false) useRapier = false;
        else if (meta && meta.useRapier === false) useRapier = false;
        // add defines
        const webpackModule = userSettings.modules?.webpack;
        const definePlugin = webpackModule && new webpackModule.DefinePlugin({
            NEEDLE_ENGINE_VERSION: JSON.stringify(tryGetNeedleEngineVersion() ?? "0.0.0"),
            NEEDLE_ENGINE_GENERATOR: JSON.stringify(tryGetGenerator() ?? "unknown"),
            NEEDLE_USE_RAPIER: JSON.stringify(useRapier),
            NEEDLE_PUBLIC_KEY: JSON.stringify(projectId),
            // TODO globalThis is not solved via DefinePlugin
            parcelRequire: undefined,
        });
        if (!definePlugin) console.log("WARN: no define plugin provided. Did you miss adding the webpack module to the next config? You can pass it to the Needle plugins via `nextConfig.modules = { webpack };`");
        else
            config.plugins.push(definePlugin);

        if (!config.module) config.module = {};
        if (!config.module.rules) config.module.rules = [];


        // add license plugin
        const team_id = userSettings?.license?.team || undefined;

        config.module.rules.push({
            test: /engine_license\.(ts|js)$/,
            loader: resolve(__dirname, `license.cjs`),
            options: {
                team: team_id,
                accessToken: userSettings?.license?.accessToken,
            }
        });
        // add mesh bvh worker transform
        config.module.rules.push({
            test: /generateMeshBVH.worker\.js$/,
            loader: resolve(__dirname, 'meshbvhworker.cjs')
        });

        alias(config);

        // these hooks are invoked but nextjs deletes the files again:
        // add webpack done plugin https://webpack.js.org/api/compiler-hooks/
        // config.plugins.push({
        //     apply(compiler) {
        //         compiler.hooks.shutdown.tap('NeedleDonePlugin', (stats) => {
        //             return createBuildInfoFile(nextConfig.distDir);
        //         });
        //     }
        // });
        // so as a workaround for above's problem:
        // hook into process quit event since there doesn't seem to be a next hook for "after emit"
        // node's beforeExit event is not called :(
        process.on('exit', (code) => {
            if (code === 0)
                return createBuildInfoFile(nextConfig.distDir);
        });


        return config;
    }


    return nextConfig;
};

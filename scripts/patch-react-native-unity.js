#!/usr/bin/env node
/**
 * Patches @artmajeur/react-native-unity to properly register RNUnityView
 * as a Fabric component.
 *
 * The package is missing ios.componentProvider in its codegenConfig,
 * which prevents automatic registration in RCTThirdPartyComponentsProvider.mm
 *
 * Run: node scripts/patch-react-native-unity.js
 * Or add to package.json postinstall: "postinstall": "node scripts/patch-react-native-unity.js"
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_PATH = path.join(__dirname, '..', 'node_modules', '@artmajeur', 'react-native-unity', 'package.json');

function patchPackage() {
    console.log('[patch-react-native-unity] Checking @artmajeur/react-native-unity...');

    if (!fs.existsSync(PACKAGE_PATH)) {
        console.log('[patch-react-native-unity] Package not found (not installed yet), skipping');
        return;
    }

    const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));

    // Check if already patched
    if (pkg.codegenConfig?.ios?.componentProvider?.RNUnityView) {
        console.log('[patch-react-native-unity] Already patched, skipping');
        return;
    }

    // Add the ios.componentProvider config
    pkg.codegenConfig = pkg.codegenConfig || {};
    pkg.codegenConfig.ios = pkg.codegenConfig.ios || {};
    pkg.codegenConfig.ios.componentProvider = {
        "RNUnityView": "RNUnityView"
    };

    fs.writeFileSync(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + '\n');
    console.log('[patch-react-native-unity] ✅ Patched codegenConfig to register RNUnityView');
    console.log('[patch-react-native-unity] This enables Fabric component discovery during codegen');
}

// Also patch the generated file directly if it exists (backup solution)
function patchGeneratedFile() {
    const generatedPath = path.join(__dirname, '..', 'ios', 'build', 'generated', 'ios', 'RCTThirdPartyComponentsProvider.mm');

    if (!fs.existsSync(generatedPath)) {
        console.log('[patch-react-native-unity] Generated provider file not found yet');
        return;
    }

    let content = fs.readFileSync(generatedPath, 'utf8');

    // Check if already contains RNUnityView
    if (content.includes('@"RNUnityView"')) {
        console.log('[patch-react-native-unity] Provider file already contains RNUnityView');
        return;
    }

    // Find the last entry before the closing brace and add our entry
    const insertPoint = content.lastIndexOf('};');
    if (insertPoint === -1) {
        console.error('[patch-react-native-unity] Could not find insertion point in provider file');
        return;
    }

    // Find the previous line to add a comma if needed
    const beforeInsert = content.substring(0, insertPoint);
    const lastCommaIndex = beforeInsert.lastIndexOf(',');
    const lastNewlineIndex = beforeInsert.lastIndexOf('\n');

    let newEntry = '\t\t@"RNUnityView": NSClassFromString(@"RNUnityView"), // react-native-unity\n';

    // Insert before the closing brace
    const newContent = content.substring(0, insertPoint) + newEntry + '    ' + content.substring(insertPoint);

    fs.writeFileSync(generatedPath, newContent);
    console.log('[patch-react-native-unity] ✅ Patched generated provider file');
}

try {
    patchPackage();
    patchGeneratedFile();
} catch (error) {
    console.error('[patch-react-native-unity] Error:', error.message);
    // Don't fail the build on patch errors
    process.exit(0);
}

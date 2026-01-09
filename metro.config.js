const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Block Unity native project from Metro bundler
// Unity folder contains C++, Objective-C, and build artifacts that Metro cannot process
// Use anchored patterns (^) to avoid blocking node_modules/@*/react-native-unity
config.resolver.blockList = [
    /^unity\/.*/,           // Only block ./unity/ at project root
    /\/ios\/.*\.xcodeproj/, // Block Xcode project files
    /\/ios\/.*\.xcworkspace/, // Block Xcode workspace files
];

// Add support for 3D model file extensions and video
config.resolver.assetExts.push(
    // 3D model formats
    'glb',
    'gltf',
    'obj',
    'mtl',
    'fbx',
    'dae',
    'vrx',
    'arobject',
    // Additional asset formats that ViroReact might use
    'hdr',
    'ktx',
    // Video formats
    'mp4',
    'mov'
);

// Explicit node_modules resolution (default is typically sufficient, but explicit is safer)
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;

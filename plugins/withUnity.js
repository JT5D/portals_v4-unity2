const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withSettingsGradle,
  withAndroidManifest,
  withGradleProperties,
  withStringsXml,
  withDangerousMod,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const getProjectRoot = (config) =>
  config.modRequest?.projectRoot || config._internal?.projectRoot || process.cwd();

const assertUnityAndroidExport = (projectRoot) => {
  const unityAndroidPath = path.join(projectRoot, 'unity', 'builds', 'android', 'unityLibrary');
  if (!fs.existsSync(unityAndroidPath)) {
    throw new Error(
      `[withUnity] unityLibrary not found at ${unityAndroidPath}. ` +
      `Export Unity Android build (Export Project) to unity/builds/android.`
    );
  }
  return unityAndroidPath;
};

const copyDirIfNewer = (src, dest) => {
  if (!fs.existsSync(src)) return;
  const destExists = fs.existsSync(dest);
  const srcStat = fs.statSync(src);
  const destStat = destExists ? fs.statSync(dest) : null;
  const shouldCopy = !destExists || (destStat && srcStat.mtimeMs > destStat.mtimeMs);

  if (shouldCopy) {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
  }
};

const withAndroidUnity = (config) => {
  // 1. Update settings.gradle to include unityLibrary
  config = withSettingsGradle(config, (config) => {
    const projectRoot = getProjectRoot(config);
    assertUnityAndroidExport(projectRoot);
    if (!config.modResults.contents.includes("include ':unityLibrary'")) {
      config.modResults.contents += `
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, '../unity/builds/android/unityLibrary')
`;
    }
    return config;
  });

  // 2. Update project build.gradle to include flatDir for libs
  config = withProjectBuildGradle(config, (config) => {
    const projectRoot = getProjectRoot(config);
    assertUnityAndroidExport(projectRoot);
    if (!config.modResults.contents.includes("flatDir")) {
      const repositoryBlock = `
        flatDir {
            dirs "\${project(':unityLibrary').projectDir}/libs"
        }
`;
      config.modResults.contents = config.modResults.contents.replace(
        /repositories\s?{/,
        `repositories {${repositoryBlock}`
      );
    }
    return config;
  });

  // 3. Update app build.gradle to implement project(':unityLibrary')
  config = withAppBuildGradle(config, (config) => {
    const projectRoot = getProjectRoot(config);
    assertUnityAndroidExport(projectRoot);
    if (!config.modResults.contents.includes("implementation project(':unityLibrary')")) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s?{/,
        `dependencies {
    implementation project(':unityLibrary')`
      );
    }
    return config;
  });

  // 4. Update AndroidManifest to avoid merge issues
  config = withAndroidManifest(config, (config) => {
    const projectRoot = getProjectRoot(config);
    assertUnityAndroidExport(projectRoot);
    const mainApplication = config.modResults.manifest.application[0];
    if (!mainApplication.$['tools:replace']) {
      mainApplication.$['xmlns:tools'] = "http://schemas.android.com/tools";
      mainApplication.$['tools:replace'] = "android:allowBackup";
      // Note: Full merge config might require more specific 'tools:replace' depending on Unity version
    }
    return config;
  });

  // 5. Ensure Unity streaming assets are configured.
  config = withGradleProperties(config, (config) => {
    const projectRoot = getProjectRoot(config);
    assertUnityAndroidExport(projectRoot);
    const existing = config.modResults.find((item) => item.type === 'property' && item.key === 'unityStreamingAssets');
    if (existing) {
      existing.value = '.unity3d';
    } else {
      config.modResults.push({ type: 'property', key: 'unityStreamingAssets', value: '.unity3d' });
    }
    return config;
  });

  // 6. Add accessibility string used by UnityView.
  config = withStringsXml(config, (config) => {
    const projectRoot = getProjectRoot(config);
    assertUnityAndroidExport(projectRoot);
    const resources = config.modResults.resources;
    resources.string = resources.string || [];
    const hasString = resources.string.some((item) => item.$?.name === 'game_view_content_description');
    if (!hasString) {
      resources.string.push({
        $: { name: 'game_view_content_description' },
        _: 'Game view',
      });
    }
    return config;
  });

  config = withDangerousMod(config, ['android', async (config) => {
    const projectRoot = getProjectRoot(config);
    const unityAndroidPath = assertUnityAndroidExport(projectRoot);
    const unityAssetsPath = path.join(unityAndroidPath, 'src', 'main', 'assets');
    const appAssetsPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
    if (fs.existsSync(unityAssetsPath)) {
      fs.mkdirSync(appAssetsPath, { recursive: true });
      copyDirIfNewer(unityAssetsPath, appAssetsPath);
    }
    return config;
  }]);

  return config;
};

const withIosUnity = (config) => {
  return withXcodeProject(config, (config) => {
    const projectRoot = getProjectRoot(config);
    const unityFrameworkPath = path.join(projectRoot, 'unity', 'builds', 'ios', 'UnityFramework.framework');
    const unityFrameworkDataPath = path.join(unityFrameworkPath, 'Data');
    const podFrameworkPath = path.join(projectRoot, 'node_modules', '@azesmway', 'react-native-unity', 'ios', 'UnityFramework.framework');

    if (!fs.existsSync(unityFrameworkPath)) {
      throw new Error(
        `[withUnity] UnityFramework.framework not found at ${unityFrameworkPath}. ` +
        `Export Unity (BuildScript.PerformIOSBuild) and rebuild the framework.`
      );
    } else if (!fs.existsSync(unityFrameworkDataPath)) {
      throw new Error(
        `[withUnity] UnityFramework Data folder missing at ${unityFrameworkDataPath}. ` +
        `Ensure the Unity iOS export adds Data to the UnityFramework target and rebuild the framework.`
      );
    }

    // Ensure the pod's vendored framework is refreshed before pod install.
    fs.mkdirSync(path.dirname(podFrameworkPath), { recursive: true });
    copyDirIfNewer(unityFrameworkPath, podFrameworkPath);

    return config;
  });
};

const withUnity = (config) => {
  config = withAndroidUnity(config);
  config = withIosUnity(config);
  return config;
};

module.exports = withUnity;

const { withProjectBuildGradle, withAppBuildGradle, withSettingsGradle, withAndroidManifest, withXcodeProject } = require('@expo/config-plugins');
const { addResourceFileToGroup, getProjectName } = require('@expo/config-plugins/build/ios/utils/Xcodeproj');
const fs = require('fs');
const path = require('path');

const withAndroidUnity = (config) => {
  // 1. Update settings.gradle to include unityLibrary
  config = withSettingsGradle(config, (config) => {
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
    const mainApplication = config.modResults.manifest.application[0];
    if (!mainApplication.$['tools:replace']) {
      mainApplication.$['xmlns:tools'] = "http://schemas.android.com/tools";
      mainApplication.$['tools:replace'] = "android:allowBackup";
      // Note: Full merge config might require more specific 'tools:replace' depending on Unity version
    }
    return config;
  });

  return config;
};

const withIosUnity = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const iosProjectRoot = path.join(projectRoot, 'ios');
    const unityDataPath = path.join(projectRoot, 'unity', 'builds', 'ios', 'Data');
    const unityDataRelativePath = path.relative(iosProjectRoot, unityDataPath);
    const projectName = getProjectName(projectRoot);

    if (!fs.existsSync(unityDataPath)) {
      console.warn(
        `[withUnity] Unity iOS Data folder not found at ${unityDataPath}. ` +
        `Export Unity (BuildScript.PerformIOSBuild) and re-run prebuild to include it.`
      );
    }

    if (!project.hasFile(unityDataRelativePath)) {
      addResourceFileToGroup({
        filepath: unityDataRelativePath,
        groupName: `${projectName}/Unity`,
        project,
        isBuildFile: true,
        verbose: true,
      });
    }

    return config;
  });
};

const withUnity = (config) => {
  config = withAndroidUnity(config);
  config = withIosUnity(config);
  return config;
};

module.exports = withUnity;

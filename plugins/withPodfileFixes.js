const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Expo Config Plugin to inject custom fixes into the generated Podfile.
 * This ensures fixes survive 'npx expo prebuild --clean'.
 */
const withPodfileFixes = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // 1. Inject Logic into post_install
      if (!podfileContent.includes("# --- AUTO-INJECTED BY withPodfileFixes PLUGIN ---")) {
        // We calculate the Team ID here so we can inject it as a fallback in the Podfile
        let teamIdFallback = '';
        try {
            teamIdFallback = execSync('security find-identity -v -p codesigning | grep "Apple Development" | head -1 | grep -o "(.*)" | tr -d "()"')
                .toString()
                .trim();
        } catch (e) {}

        const injection = `
    # --- AUTO-INJECTED BY withPodfileFixes PLUGIN ---
    # Use environment variable if set, otherwise fallback to the ID detected during prebuild
    development_team = ENV['EXPO_PUBLIC_DEVELOPMENT_TEAM'] || '${teamIdFallback}'

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if !development_team.empty?
          config.build_settings['DEVELOPMENT_TEAM'] = development_team
        end
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
      if target.name == 'react-native-maps' || target.name == 'RNSVG'
        target.build_configurations.each do |config|
          config.build_settings['OTHER_LDFLAGS'] = ['-undefined', 'dynamic_lookup']
        end
      end
    end
    # --- END AUTO-INJECTION ---`;

        // We find the 'react_native_post_install' block and insert our code right after it finishes.
        podfileContent = podfileContent.replace(
          /(react_native_post_install\([\s\S]*?\))\n/,
          `$1\n${injection}\n`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);
      return config;
    },
  ]);
};

module.exports = withPodfileFixes;

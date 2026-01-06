module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  apps: {
    'ios.device.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphoneos/Portals.app',
      build:
        'xcodebuild -workspace ios/Portals.xcworkspace -scheme Portals -configuration Debug -destination generic/platform=iOS -derivedDataPath ios/build',
    },
  },
  devices: {
    iosDevice: {
      type: 'ios.device',
    },
  },
  configurations: {
    'ios.device.debug': {
      device: 'iosDevice',
      app: 'ios.device.debug',
    },
  },
};

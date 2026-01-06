import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
export const Commands = codegenNativeCommands({
  supportedCommands: ['postMessage', 'unloadUnity', 'pauseUnity', 'resumeUnity', 'windowFocusChanged']
});
export default codegenNativeComponent('RNUnityView');
//# sourceMappingURL=UnityViewNativeComponent.js.map
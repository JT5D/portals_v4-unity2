function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
import React from 'react';
import NativeUnityView, { Commands } from './specs/UnityViewNativeComponent';
import { Platform } from 'react-native';
export default class UnityView extends React.Component {
  ref = /*#__PURE__*/React.createRef();
  postMessage = (gameObject, methodName, message) => {
    if (this.ref.current) {
      Commands.postMessage(this.ref.current, gameObject, methodName, message);
    }
  };
  unloadUnity = () => {
    if (this.ref.current) {
      Commands.unloadUnity(this.ref.current);
    }
  };
  pauseUnity(pause) {
    if (this.ref.current) {
      Commands.pauseUnity(this.ref.current, pause);
    }
  }
  resumeUnity() {
    if (this.ref.current) {
      Commands.resumeUnity(this.ref.current);
    }
  }
  windowFocusChanged(hasFocus = true) {
    if (Platform.OS !== 'android') return;
    if (this.ref.current) {
      Commands.windowFocusChanged(this.ref.current, hasFocus);
    }
  }
  getProps() {
    return {
      ...this.props
    };
  }
  componentWillUnmount() {
    if (this.ref.current) {
      Commands.unloadUnity(this.ref.current);
    }
  }
  render() {
    return /*#__PURE__*/React.createElement(NativeUnityView, _extends({
      ref: this.ref
    }, this.getProps()));
  }
}
//# sourceMappingURL=UnityView.js.map
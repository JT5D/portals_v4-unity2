function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import React from 'react';
import { Platform } from 'react-native';
import NativeUnityView, { Commands } from './specs/UnityViewNativeComponent';
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
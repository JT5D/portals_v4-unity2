"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _UnityViewNativeComponent = _interopRequireWildcard(require("./specs/UnityViewNativeComponent"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
class UnityView extends _react.default.Component {
  ref = /*#__PURE__*/_react.default.createRef();
  postMessage = (gameObject, methodName, message) => {
    if (this.ref.current) {
      _UnityViewNativeComponent.Commands.postMessage(this.ref.current, gameObject, methodName, message);
    }
  };
  unloadUnity = () => {
    if (this.ref.current) {
      _UnityViewNativeComponent.Commands.unloadUnity(this.ref.current);
    }
  };
  pauseUnity(pause) {
    if (this.ref.current) {
      _UnityViewNativeComponent.Commands.pauseUnity(this.ref.current, pause);
    }
  }
  resumeUnity() {
    if (this.ref.current) {
      _UnityViewNativeComponent.Commands.resumeUnity(this.ref.current);
    }
  }
  windowFocusChanged(hasFocus = true) {
    if (_reactNative.Platform.OS !== 'android') return;
    if (this.ref.current) {
      _UnityViewNativeComponent.Commands.windowFocusChanged(this.ref.current, hasFocus);
    }
  }
  getProps() {
    return {
      ...this.props
    };
  }
  componentWillUnmount() {
    if (this.ref.current) {
      _UnityViewNativeComponent.Commands.unloadUnity(this.ref.current);
    }
  }
  render() {
    return /*#__PURE__*/_react.default.createElement(_UnityViewNativeComponent.default, _extends({
      ref: this.ref
    }, this.getProps()));
  }
}
exports.default = UnityView;
//# sourceMappingURL=UnityView.js.map
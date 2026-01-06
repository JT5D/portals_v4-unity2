"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireDefault(require("react"));
var _UnityViewNativeComponent = _interopRequireWildcard(require("./specs/UnityViewNativeComponent"));
var _reactNative = require("react-native");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
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
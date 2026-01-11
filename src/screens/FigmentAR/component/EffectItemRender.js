/**
 * Copyright (c) 2017-present, Viro Media, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */
'use strict';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as LoadConstants from '../redux/LoadingStateConstants';
import * as UIConstants from '../redux/UIConstants';
import {
  ViroScene,
  ViroARScene,
  ViroARPlane,
  ViroMaterials,
  ViroNode,
  Viro3DObject,
  ViroText,
} from '@reactvision/react-viro';

class EffectItemRender extends Component {
  constructor(props) {
    super(props);
  }

  // renders the selected effect from the list of effectItems
  render() {
    var j = this.props.index;
    const effectResult = this.props.effectItem.effect();
    console.log('[EffectItemRender] Rendering effect index:', j, 'name:', this.props.effectItem.name);
    console.log('[EffectItemRender] Effect function result:', effectResult, 'type:', typeof effectResult, 'length:', Array.isArray(effectResult) ? effectResult.length : 'N/A');
    return (
      <ViroNode key={j} >
        {effectResult}
      </ViroNode>
    );
  }
};

EffectItemRender.propTypes = {
  effectItem: PropTypes.any,
  index: PropTypes.number,
};

module.exports = EffectItemRender;

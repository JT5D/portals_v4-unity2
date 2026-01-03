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
import { StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import * as LoadConstants from '../redux/LoadingStateConstants';
import * as UIConstants from '../redux/UIConstants';
import * as ModelData from '../model/ModelItems';
import TimerMixin from 'react-timer-mixin';
import ParticleEmitter from '../model/emitters/ParticleEmitter';
import renderIf from '../helpers/renderIf';

import {
  ViroMaterials,
  ViroNode,
  Viro3DObject,
  ViroSpotLight,
  ViroAmbientLight,
  ViroQuad,
  ViroAnimations,
  ViroText,
  ViroParticleEmitter,
} from '@reactvision/react-viro';
import * as FileSystem from 'expo-file-system/legacy';

var createReactClass = require('create-react-class');

// Global store for attractor world positions (so followers can read animated positions)
// Key: UUID, Value: { x, y, z } current animated world position
const attractorWorldPositions = {};

// Bright modern color palette (HSL values for vibrant colors)
const BRIGHT_COLORS = [
  '#FF3366', // Hot Pink
  '#FF6B35', // Orange Red
  '#F7931A', // Bitcoin Orange
  '#FFD700', // Gold
  '#00FF88', // Mint Green
  '#00D4FF', // Cyan
  '#7B68EE', // Medium Slate Blue
  '#FF69B4', // Hot Pink
  '#00CED1', // Dark Turquoise
  '#FF4500', // Orange Red
  '#9370DB', // Medium Purple
  '#20B2AA', // Light Sea Green
  '#FF1493', // Deep Pink
  '#00FA9A', // Medium Spring Green
  '#8A2BE2', // Blue Violet
  '#DC143C', // Crimson
  '#00BFFF', // Deep Sky Blue
  '#FF8C00', // Dark Orange
];

// Generate a random bright color
function getRandomBrightColor() {
  return BRIGHT_COLORS[Math.floor(Math.random() * BRIGHT_COLORS.length)];
}

// Get complementary color (180 degrees on color wheel)
function getComplementaryColor(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Get complementary
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;

  return '#' + [compR, compG, compB].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Track created dynamic materials
const createdMaterials = new Set();


/**
 * Class that encapsulates everything needed to be added to the scene when a user adds a Model (3D Object)
 * from the listview. This configures position, rotation, etc. for the objects, as well as click / pinch gesture
 * behaviors. Additionally this also configures a SpotLight and a corresponding ViroQuad for shadows below the object
 */
var ModelItemRender = createReactClass({
  mixins: [TimerMixin],
  propTypes: {
    // All props retreived from the data model for Models (See js/model/ModelItems.js)
    modelIDProps: PropTypes.any,
    // Callback function that gets triggered once the model is loaded
    onLoadCallback: PropTypes.func,
    // Callback function thats fired when a user clicks the model
    onClickStateCallback: PropTypes.func,
    // A callback method thats provided here, gets triggered when the model loads that resolves to the correct
    // position and orientation for the model to be placed at initially
    hitTestMethod: PropTypes.func,
    // Callback to sync transforms back to Redux
    onTransformUpdate: PropTypes.func,
  },

  getInitialState() {
    // Get base scale from model data and multiply by 2.5 for 0.5 default size
    const isCustom = this.props.modelIDProps.index === -1;
    const modelItem = isCustom ? this.props.modelIDProps : ModelData.getModelArray()[this.props.modelIDProps.index];
    // Use explicit isFromDraft flag (set by LOAD_SCENE reducer)
    const isLoadedFromDraft = this.props.modelIDProps.isFromDraft === true;

    console.log('[ModelItemRender] getInitialState DETAILED:', {
      uuid: this.props.modelIDProps.uuid,
      isLoadedFromDraft,
      propsPosition: JSON.stringify(this.props.modelIDProps.position),
      propsRotation: JSON.stringify(this.props.modelIDProps.rotation),
      propsScale: JSON.stringify(this.props.modelIDProps.scale),
    });

    // Use saved values if loading from draft, otherwise use defaults
    let initialScale;
    let initialPosition;
    let initialRotation;

    if (isLoadedFromDraft && this.props.modelIDProps.scale) {
      // Use the saved scale from draft
      initialScale = this.props.modelIDProps.scale;
    } else {
      // Default scale for new models
      const baseScale = modelItem.scale || [0.2, 0.2, 0.2];
      initialScale = baseScale.map(s => s * 2.5);
    }

    if (isLoadedFromDraft && this.props.modelIDProps.position) {
      // Use the saved position from draft
      initialPosition = this.props.modelIDProps.position;
    } else {
      // Start high in sky to wait for hitTest placement
      initialPosition = [0, 10, 1];
    }

    if (isLoadedFromDraft && this.props.modelIDProps.rotation) {
      // Use the saved rotation from draft
      initialRotation = this.props.modelIDProps.rotation;
    } else {
      initialRotation = [0, 0, 0];
    }

    console.log('[ModelItemRender] Using transforms:', {
      position: JSON.stringify(initialPosition),
      rotation: JSON.stringify(initialRotation),
      scale: JSON.stringify(initialScale),
    });

    // Generate a random bright color for this primitive
    const randomColor = getRandomBrightColor();
    const materialName = `dynamicColor_${this.props.modelIDProps.uuid}`;

    // Create dynamic material BEFORE first render
    // const modelItem = ... (already defined above)
    if (modelItem.type === 'GLB' && !createdMaterials.has(materialName)) {
      ViroMaterials.createMaterials({
        [materialName]: {
          lightingModel: 'PBR',
          diffuseColor: randomColor,
          metalness: 0.3,
          roughness: 0.4,
        },
      });
      createdMaterials.add(materialName);
      console.log('[ModelItemRender] Created material:', materialName, 'with color:', randomColor);
    }

    return {
      scale: initialScale,
      rotation: initialRotation,
      nodeIsVisible: true,
      position: initialPosition,
      shouldBillboard: !isLoadedFromDraft, // Don't billboard if loading from draft
      runAnimation: true,
      showParticles: true,
      itemClickedDown: false,
      materialColor: randomColor,
      materialName: materialName,
      // For custom models - track local file path after download
      localModelPath: null,
      isDownloading: false,
      downloadError: null,
    }
  },

  componentDidMount() {
    console.log('[ModelItemRender] componentDidMount - UUID:', this.props.modelIDProps.uuid);
    this._modelData = ModelData.getModelArray();
    this._isMounted = true;
    this._hasInitialSynced = false; // Prevent duplicate initial transform syncs

    // Check if this is a custom model with a remote URL
    const isCustom = this.props.modelIDProps.index === -1;
    if (isCustom && this.props.modelIDProps.source?.uri) {
      const remoteUri = this.props.modelIDProps.source.uri;
      console.log('[ModelItemRender] Custom model detected, downloading from:', remoteUri);
      this._downloadRemoteModel(remoteUri);
    }

    // Force a re-render after a short delay to work around ViroReact batching issue
    // where the first render cycle doesn't properly attach nodes to the scene graph
    this.setTimeout(() => {
      if (this._isMounted) {
        console.log('[ModelItemRender] Forcing re-render for UUID:', this.props.modelIDProps.uuid);
        this.forceUpdate();
        // Start any animations that were loaded with the scene
        this._updateAnimationState();
      }
    }, 100);
  },

  async _downloadRemoteModel(remoteUri) {
    try {
      this.setState({ isDownloading: true });

      // Generate local filename from UUID
      const uuid = this.props.modelIDProps.uuid;
      const ext = this.props.modelIDProps.source?.uri?.split('.').pop() || 'glb';
      const localFileName = `${uuid}.${ext}`;
      const localPath = `${FileSystem.cacheDirectory}models/${localFileName}`;

      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.cacheDirectory}models`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}models`, { intermediates: true });
      }

      // Check if already cached
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log('[ModelItemRender] Model already cached at:', localPath);
        if (this._isMounted) {
          this.setState({ localModelPath: localPath, isDownloading: false });
        }
        return;
      }

      console.log('[ModelItemRender] Downloading model to:', localPath);
      const downloadResult = await FileSystem.downloadAsync(remoteUri, localPath);

      if (downloadResult.status === 200) {
        console.log('[ModelItemRender] Download complete, local path:', downloadResult.uri);
        if (this._isMounted) {
          this.setState({ localModelPath: downloadResult.uri, isDownloading: false });
        }
      } else {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('[ModelItemRender] Download error:', error);
      if (this._isMounted) {
        this.setState({ downloadError: error.message, isDownloading: false });
      }
    }
  },

  componentDidUpdate(prevProps) {
    // Re-render when objectAnimations change and start/stop animation loop
    if (JSON.stringify(prevProps.objectAnimations) !== JSON.stringify(this.props.objectAnimations)) {
      console.log('[ModelItemRender] objectAnimations changed for UUID:', this.props.modelIDProps.uuid, 'new anims:', JSON.stringify(this.props.objectAnimations));
      // Start or stop JS-driven animation based on new state
      this._updateAnimationState();
    }

    // Also check for parentAnimations changes - child needs to animate if parent is animating
    if (JSON.stringify(prevProps.parentAnimations) !== JSON.stringify(this.props.parentAnimations)) {
      console.log('[ModelItemRender] parentAnimations changed for UUID:', this.props.modelIDProps.uuid, 'parent anims:', JSON.stringify(this.props.parentAnimations));
      this._updateAnimationState();
    }


    // CRITICAL: Handle case where LOAD_SCENE updates Redux AFTER component mounts
    // When isFromDraft changes from false/undefined to true, update state with saved transforms
    const wasFromDraft = prevProps.modelIDProps.isFromDraft === true;
    const isNowFromDraft = this.props.modelIDProps.isFromDraft === true;

    if (!wasFromDraft && isNowFromDraft) {
      const newPosition = this.props.modelIDProps.position || this.state.position;
      const newRotation = this.props.modelIDProps.rotation || this.state.rotation;
      const newScale = this.props.modelIDProps.scale || this.state.scale;

      console.log('[ModelItemRender] isFromDraft changed to true, updating transforms:', {
        uuid: this.props.modelIDProps.uuid,
        position: JSON.stringify(newPosition),
        rotation: JSON.stringify(newRotation),
        scale: JSON.stringify(newScale),
      });

      // Update React state with saved transforms from the draft
      this.setState({
        position: newPosition,
        rotation: newRotation,
        scale: newScale,
        shouldBillboard: false, // Disable billboard for draft-loaded models
        nodeIsVisible: true,
      });

      // CRITICAL: ViroReact caches transforms and ignores React state changes
      // Must use setNativeProps to force the native component to update
      if (this.arNodeRef) {
        this.arNodeRef.setNativeProps({
          position: newPosition,
          rotation: newRotation,
          scale: newScale,
        });
      }
    }

    // VOICE COMMAND: Sync position/scale changes from Redux (e.g., ARRANGE_FORMATION, BATCH_TRANSFORM)
    const prevPosition = prevProps.modelIDProps.position;
    const newPosition = this.props.modelIDProps.position;
    const prevScale = prevProps.modelIDProps.scale;
    const newScale = this.props.modelIDProps.scale;

    const positionChanged = JSON.stringify(prevPosition) !== JSON.stringify(newPosition);
    const scaleChanged = JSON.stringify(prevScale) !== JSON.stringify(newScale);

    // GUARD: Skip Redux sync during active gestures to prevent snap/jump on gesture end
    // When a pinch or rotate gesture is active, we're using setNativeProps for visuals
    // and will sync to state at gesture end ourselves
    const gestureActive = this._initialPinchScale || this._initialRotationY !== null;

    // GUARD: Also skip sync if Redux value matches our pending gesture value
    // This prevents snap after gesture ends - we just synced this value to Redux ourselves
    const scaleMatchesPending = this._pendingScale &&
      JSON.stringify(newScale) === JSON.stringify(this._pendingScale);
    const positionMatchesPending = this._pendingPosition &&
      JSON.stringify(newPosition) === JSON.stringify(this._pendingPosition);

    // Skip if both position and scale are from our gesture handlers
    if (positionMatchesPending && (scaleMatchesPending || !scaleChanged)) {
      // Skip entirely - we just synced these values ourselves
      return;
    }

    if ((positionChanged || scaleChanged) && !isNowFromDraft && !gestureActive) {
      // Skip scale sync if it matches what we just sent from gesture handler
      if (scaleChanged && scaleMatchesPending && !positionChanged) {
        console.log('[ModelItemRender] Skipping Redux scale sync - matches pending gesture value');
      } else if (!positionMatchesPending && (positionChanged || (scaleChanged && !scaleMatchesPending))) {
        console.log('[ModelItemRender] Redux position/scale changed for:', this.props.modelIDProps.uuid, {
          prevPosition,
          newPosition,
          prevScale,
          newScale,
        });

        // Update React state (only for non-gesture changes)
        this.setState({
          position: positionMatchesPending ? this.state.position : (newPosition || this.state.position),
          scale: scaleMatchesPending ? this.state.scale : (newScale || this.state.scale),
        });

        // Force ViroReact native component to update (only for non-gesture changes)
        if (this.arNodeRef && !scaleMatchesPending && !positionMatchesPending) {
          const nativeUpdate = {};
          if (positionChanged && newPosition && !positionMatchesPending) nativeUpdate.position = newPosition;
          if (scaleChanged && newScale && !scaleMatchesPending) nativeUpdate.scale = newScale;
          if (Object.keys(nativeUpdate).length > 0) {
            this.arNodeRef.setNativeProps(nativeUpdate);
          }
        }
      }
    }
  },

  componentWillUnmount() {
    console.log('[ModelItemRender] componentWillUnmount - UUID:', this.props.modelIDProps.uuid);
    this._isMounted = false;
    // Clean up animation loop
    this._stopAnimationLoop();
    // Clean up drag timeout if pending
    if (this._dragEndTimeout) {
      clearTimeout(this._dragEndTimeout);
      this._dragEndTimeout = null;
    }
  },

  // ===== JS-DRIVEN ANIMATION SYSTEM =====
  // ViroReact's animation prop on Viro3DObject causes native crashes (see README Section 4)
  // This system manually animates transforms using setNativeProps

  _startAnimationLoop() {
    if (this._animationInterval) return; // Already running

    const activeAnim = this._getActiveAnimationType();
    if (!activeAnim) return;

    console.log('[ModelItemRender] Starting JS animation loop:', activeAnim, 'for UUID:', this.props.modelIDProps.uuid);

    this._animationStartTime = Date.now();
    this._animationPhase = 0; // 0 = first half, 1 = second half

    // Run animation at 30fps (33ms interval)
    this._animationInterval = this.setInterval(() => {
      if (!this._isMounted || !this.arNodeRef) {
        this._stopAnimationLoop();
        return;
      }
      this._tickAnimation();
    }, 33);
  },

  _stopAnimationLoop() {
    if (this._animationInterval) {
      console.log('[ModelItemRender] Stopping JS animation loop for UUID:', this.props.modelIDProps.uuid);
      this.clearInterval(this._animationInterval);
      this._animationInterval = null;
    }
  },

  _getActiveAnimationType() {
    const objectAnims = this.props.objectAnimations || {};
    const parentAnims = this.props.parentAnimations || {};
    const animOrder = ['bounce', 'pulse', 'rotate', 'scale', 'wiggle', 'random', 'path', 'vertical'];

    // Check own animations first
    for (const animType of animOrder) {
      if (objectAnims[animType]?.active) {
        return animType;
      }
    }
    // Also check parent animations - child needs to animate if parent is animating
    for (const animType of animOrder) {
      if (parentAnims[animType]?.active) {
        return 'parent_' + animType; // Indicate it's a parent animation
      }
    }
    // Check if this object is following an attractor (needs animation tick)
    if (objectAnims?.attractor?.useAttractor && objectAnims?.attractor?.attractorUUID) {
      return 'attractor_follower';
    }
    // Note: Physics is handled natively by ViroReact's physicsBody prop, no JS animation loop needed
    return null;
  },

  _tickAnimation() {
    if (!this.arNodeRef) return;

    const objectAnims = this.props.objectAnimations || {};
    const parentAnims = this.props.parentAnimations || {}; // Inherited from parent
    const elapsed = Date.now() - this._animationStartTime;

    // Get base transforms BEFORE processing animations
    const basePosition = this.state.position;
    const baseRotation = this.state.rotation;
    const baseScale = this.state.scale;

    // Calculate combined transform offsets from ALL active animations
    let positionOffset = [0, 0, 0];
    let rotationOffset = [0, 0, 0];
    let scaleMultiplier = [1, 1, 1];

    // Process parent animations FIRST (if child has a parent)
    // This makes child inherit parent's path, bounce, etc.
    const animOrder = ['path', 'vertical', 'bounce', 'pulse', 'rotate', 'scale', 'wiggle', 'random'];

    // DEBUG: Log parent animations if any exist
    if (Object.keys(parentAnims).length > 0) {
      console.log('[ModelItemRender] parentAnims keys:', Object.keys(parentAnims), 'path active?', parentAnims.path?.active);
    }

    // FIRST: Apply parent's animations (path, vertical, etc) - child follows parent
    // This is done BEFORE child's own animations so they stack
    for (const animType of animOrder) {
      const parentAnimData = parentAnims[animType];
      if (!parentAnimData?.active) continue;

      console.log('[ModelItemRender] Applying parent animation:', animType);

      const intensity = parentAnimData.intensity || 1.0;
      const cycleDuration = this._getAnimationCycleDuration(animType);
      const cycleProgress = (elapsed % cycleDuration) / cycleDuration;

      // Apply parent animation offsets using switch logic inline
      switch (animType) {
        case 'bounce':
          positionOffset[1] += Math.sin(cycleProgress * Math.PI * 2) * (0.15 * intensity);
          break;
        case 'pulse':
          const parentPulseFactor = 1 + Math.sin(cycleProgress * Math.PI * 2) * (0.15 * intensity);
          scaleMultiplier[0] *= parentPulseFactor;
          scaleMultiplier[1] *= parentPulseFactor;
          scaleMultiplier[2] *= parentPulseFactor;
          break;
        case 'rotate':
          // Use elapsed time for continuous rotation without snapping
          const parentRotSpeed = intensity;
          const parentDegreesPerMs = (360 * parentRotSpeed) / 2000;
          const parentRotAngle = (elapsed * parentDegreesPerMs) % 360;
          const parentRotAxes = parentAnimData.axes || { x: false, y: true, z: false };
          if (parentRotAxes.x) rotationOffset[0] += parentRotAngle;
          if (parentRotAxes.y) rotationOffset[1] += parentRotAngle;
          if (parentRotAxes.z) rotationOffset[2] += parentRotAngle;
          break;
        case 'wiggle':
          const parentWiggleAmt = 8 * intensity;
          rotationOffset[2] += Math.sin(cycleProgress * Math.PI * 2) * parentWiggleAmt;
          break;
        case 'path':
          // Path animation - interpolate along user-drawn XZ path
          if (parentAnimData.points && parentAnimData.points.length >= 2) {
            const pathDuration = (parentAnimData.duration || 5) * 1000;
            const pathProgress = (elapsed % pathDuration) / pathDuration;
            const pathPoints = parentAnimData.points;
            const n = pathPoints.length;
            const t = pathProgress * (n - 1);
            const i0 = Math.floor(t);
            const i1 = Math.min(i0 + 1, n - 1);
            const localT = t - i0;
            const p0 = pathPoints[i0];
            const p1 = pathPoints[i1];
            positionOffset[0] += p0.x + (p1.x - p0.x) * localT;
            positionOffset[2] += p0.z + (p1.z - p0.z) * localT;
          }
          break;
        case 'vertical':
          // Vertical animation - interpolate Y based on curve
          if (parentAnimData.points && parentAnimData.points.length >= 2) {
            const vDuration = (parentAnims.path?.duration || 5) * 1000;
            const vProgress = (elapsed % vDuration) / vDuration;
            const curvePoints = parentAnimData.points;
            let yOffset = 0;
            for (let i = 0; i < curvePoints.length - 1; i++) {
              const seg0 = curvePoints[i];
              const seg1 = curvePoints[i + 1];
              if (vProgress >= seg0.t && vProgress <= seg1.t) {
                const segT = (vProgress - seg0.t) / (seg1.t - seg0.t);
                yOffset = seg0.y + (seg1.y - seg0.y) * segT;
                break;
              }
            }
            positionOffset[1] += yOffset;
          }
          break;
        // 'random'/'float' and 'scale' can be added similarly if needed
      }
    }

    // SECOND: Apply child's own animations on top of parent's
    for (const animType of animOrder) {
      const animData = objectAnims[animType];
      if (!animData?.active) continue;

      const intensity = animData.intensity || 1.0;
      const cycleDuration = this._getAnimationCycleDuration(animType);
      const cycleProgress = (elapsed % cycleDuration) / cycleDuration;

      switch (animType) {
        case 'bounce':
          // Bounce up and down - sine wave on Y position
          const bounceHeight = 0.15 * intensity;
          positionOffset[1] += Math.sin(cycleProgress * Math.PI * 2) * bounceHeight;
          break;

        case 'pulse':
          // Pulse scale up and down (multiplicative, so we accumulate)
          const pulseAmount = 0.15 * intensity;
          const pulseFactor = 1 + Math.sin(cycleProgress * Math.PI * 2) * pulseAmount;
          scaleMultiplier[0] *= pulseFactor;
          scaleMultiplier[1] *= pulseFactor;
          scaleMultiplier[2] *= pulseFactor;
          break;

        case 'rotate':
          // Continuous rotation on selected axes - use elapsed time, not cycleProgress
          // to avoid snapping when cycle resets from 360° back to 0°
          const rotateSpeed = intensity; // 1.0 = 1 full rotation per 2 seconds
          const degreesPerMs = (360 * rotateSpeed) / 2000; // Based on 2000ms cycle
          const rotateAngle = (elapsed * degreesPerMs) % 360; // Use modulo to keep numbers reasonable
          const axis = animData.axis || { x: false, y: true, z: false }; // Default to Y-axis
          if (axis.x) rotationOffset[0] += rotateAngle;
          if (axis.y) rotationOffset[1] += rotateAngle;
          if (axis.z) rotationOffset[2] += rotateAngle;
          break;

        case 'scale':
          // Scale up and down (larger amplitude)
          const scaleAmount = 0.3 * intensity;
          const scaleFactor = 1 + Math.sin(cycleProgress * Math.PI * 2) * scaleAmount;
          scaleMultiplier[0] *= scaleFactor;
          scaleMultiplier[1] *= scaleFactor;
          scaleMultiplier[2] *= scaleFactor;
          break;

        case 'wiggle':
          // Wiggle rotation on Z axis
          const wiggleAngle = 5 * intensity;
          rotationOffset[2] += Math.sin(cycleProgress * Math.PI * 4) * wiggleAngle;
          break;

        case 'random':
        case 'float':
          // Ocean wave-like looping motion using Lissajous curves
          // Creates organic floating movement that always returns to origin
          // Uses different frequencies for each axis to create complex but looping path
          const distance = animData.distance || 1.0; // Distance multiplier for travel range
          const baseAmplitude = 0.1 * intensity * distance; // Intensity controls feel, distance controls range

          // Lissajous curve parameters - different frequencies create organic looping
          // X: slow drift left-right (frequency ratio 2)
          // Y: gentle bob up-down (frequency ratio 3)  
          // Z: medium drift forward-back (frequency ratio 2, phase shifted)

          const xFreq = 2; // Completes 2 cycles per loop
          const yFreq = 3; // Completes 3 cycles per loop (creates figure-8 style)
          const zFreq = 2; // Same as X but phase shifted

          // Phase offsets create the "pushed around" feeling
          const xPhase = 0;
          const yPhase = Math.PI / 4; // 45 degree offset
          const zPhase = Math.PI / 2; // 90 degree offset from X

          // Calculate position offsets following the Lissajous curve
          positionOffset[0] += Math.sin(cycleProgress * Math.PI * 2 * xFreq + xPhase) * baseAmplitude;
          positionOffset[1] += Math.sin(cycleProgress * Math.PI * 2 * yFreq + yPhase) * baseAmplitude * 0.6; // Y is more subtle
          positionOffset[2] += Math.sin(cycleProgress * Math.PI * 2 * zFreq + zPhase) * baseAmplitude;
          break;

        case 'path':
          // Path animation - follow drawn XZ path
          const pathData = animData;
          if (!pathData.points || pathData.points.length < 2) {
            console.log('[ModelItemRender] Path has insufficient points:', pathData.points?.length);
            break;
          }

          const pathDuration = (pathData.duration || 5) * 1000; // ms
          let pathProgress;

          if (pathData.playMode === 'once') {
            // Play once and stop
            pathProgress = Math.min(elapsed / pathDuration, 1);
          } else if (pathData.playMode === 'pingpong') {
            // Ping-pong: forward then backward
            const cycle = Math.floor(elapsed / pathDuration);
            const cycleT = (elapsed % pathDuration) / pathDuration;
            pathProgress = cycle % 2 === 0 ? cycleT : 1 - cycleT;
          } else {
            // Loop (default)
            pathProgress = (elapsed % pathDuration) / pathDuration;
          }

          // Interpolate position along path (use smooth or linear based on settings)
          const pathPos = this._interpolatePathPosition(pathData.points, pathProgress, pathData.interpolation || 'smooth');

          // Debug log every ~60 frames
          if (Math.random() < 0.02) {
            console.log('[ModelItemRender] Path anim:', {
              progress: pathProgress.toFixed(2),
              pathPos,
              basePos: [basePosition[0].toFixed(2), basePosition[2].toFixed(2)],
            });
          }

          // Set position directly to path point (not offset)
          // Path points are absolute XZ coordinates
          positionOffset[0] = pathPos.x - basePosition[0];
          positionOffset[2] = pathPos.z - basePosition[2];

          // Calculate tangent rotation if followPath is enabled
          if (pathData.followPath) {
            // Get a slightly ahead position to calculate direction
            const lookAheadT = Math.min(1, pathProgress + 0.02);
            const lookAheadPos = this._interpolatePathPosition(pathData.points, lookAheadT, pathData.interpolation || 'smooth');

            // Calculate direction vector
            const dx = lookAheadPos.x - pathPos.x;
            const dz = lookAheadPos.z - pathPos.z;

            // Calculate Y rotation (heading) from direction - atan2 gives angle in radians
            // Convert to degrees. In ViroReact, Y rotation is around Y axis
            // atan2(dx, -dz) because negative Z is forward in AR
            if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
              const headingRad = Math.atan2(dx, -dz);
              const headingDeg = headingRad * (180 / Math.PI);

              // ADD to Y rotation offset (not replace) so other animations can layer on top
              // The heading is absolute, so subtract base rotation to get the offset
              rotationOffset[1] += headingDeg - baseRotation[1];
            }
          }
          break;

        case 'vertical':
          // Vertical animation - Y position over time
          const verticalData = animData;
          if (!verticalData.points || verticalData.points.length < 2) break;

          // Use path duration if available, otherwise default
          const pathAnimData = objectAnims.path;
          const vertDuration = (pathAnimData?.duration || 5) * 1000; // ms

          // Calculate progress based on path's play mode too for consistency
          let vertProgress;
          const vertPlayMode = pathAnimData?.playMode || 'loop';

          if (vertPlayMode === 'once') {
            vertProgress = Math.min(elapsed / vertDuration, 1);
          } else if (vertPlayMode === 'pingpong') {
            const cycle = Math.floor(elapsed / vertDuration);
            const cycleT = (elapsed % vertDuration) / vertDuration;
            vertProgress = cycle % 2 === 0 ? cycleT : 1 - cycleT;
          } else {
            vertProgress = (elapsed % vertDuration) / vertDuration;
          }

          // Interpolate Y value from curve
          const yValue = this._interpolateVerticalPosition(verticalData.points, vertProgress, verticalData.interpolation || 'smooth');

          // Add Y offset
          positionOffset[1] = yValue;
          break;
      }
    }

    // Apply combined transforms via setNativeProps

    let newPosition = [
      basePosition[0] + positionOffset[0],
      basePosition[1] + positionOffset[1],
      basePosition[2] + positionOffset[2],
    ];
    const newRotation = [
      baseRotation[0] + rotationOffset[0],
      baseRotation[1] + rotationOffset[1],
      baseRotation[2] + rotationOffset[2],
    ];
    const newScale = [
      baseScale[0] * scaleMultiplier[0],
      baseScale[1] * scaleMultiplier[1],
      baseScale[2] * scaleMultiplier[2],
    ];

    // ========== ATTRACTOR/FOLLOWER LOGIC ==========
    const attractorSettings = objectAnims?.attractor;

    // If THIS object is an attractor, broadcast its current animated position
    if (attractorSettings?.isAttractor) {
      const uuid = this.props.modelIDProps.uuid;
      attractorWorldPositions[uuid] = {
        x: newPosition[0],
        y: newPosition[1],
        z: newPosition[2],
      };
    }

    // If this object is a follower (useAttractor=true), chase the attractor's ANIMATED position
    if (attractorSettings?.useAttractor && attractorSettings?.attractorUUID) {
      // Get attractor's animated world position from global store (not Redux base position)
      const attractorAnimatedPos = attractorWorldPositions[attractorSettings.attractorUUID];
      if (attractorAnimatedPos) {
        // Calculate chase speed (0.5x to 2x, default 1x) - higher = more aggressive chasing
        const followSpeed = (attractorSettings.followSpeed || 1.0) * 0.6; // Very aggressive chasing

        // Add slight random offset for swarm effect (based on uuid hash)
        const uuidHash = (this.props.modelIDProps.uuid || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const offsetX = Math.sin(uuidHash * 0.1 + elapsed * 0.001) * 0.3;
        const offsetY = Math.sin(uuidHash * 0.15 + elapsed * 0.0008) * 0.15; // Add Y variation
        const offsetZ = Math.cos(uuidHash * 0.2 + elapsed * 0.001) * 0.3;

        // Target position (attractor's animated position + offset)
        const targetPos = [
          attractorAnimatedPos.x + offsetX,
          attractorAnimatedPos.y + offsetY,
          attractorAnimatedPos.z + offsetZ,
        ];

        // Lerp toward attractor (smooth chasing)
        newPosition = [
          newPosition[0] + (targetPos[0] - newPosition[0]) * followSpeed,
          newPosition[1] + (targetPos[1] - newPosition[1]) * followSpeed,
          newPosition[2] + (targetPos[2] - newPosition[2]) * followSpeed,
        ];

        // Store the chased position for next frame (persistence)
        this._lastChasedPosition = newPosition;
      }
    } else if (this._lastChasedPosition) {
      // Continue from last chased position if we were following before
      delete this._lastChasedPosition;
    }

    // ========== PHYSICS ==========
    // Note: Physics is now handled natively by ViroReact's physicsBody prop on Viro3DObject
    // The native physics engine handles gravity, collision detection, and mesh-based collision shapes

    this.arNodeRef.setNativeProps({
      position: newPosition,
      rotation: newRotation,
      scale: newScale,
    });
  },

  _getAnimationCycleDuration(animType) {
    // Duration in milliseconds for one complete cycle
    switch (animType) {
      case 'bounce': return 600;
      case 'pulse': return 800;
      case 'rotate': return 2000;
      case 'scale': return 1000;
      case 'wiggle': return 300;
      case 'random':
      case 'float': return 4000; // 4 seconds for smooth Lissajous wave motion
      case 'path': return 5000; // Default 5 seconds, overridden by pathData.duration
      default: return 1000;
    }
  },

  // Interpolate position along a path given a progress value (0-1)
  // Supports 'linear' and 'smooth' (Catmull-Rom spline) interpolation
  _interpolatePathPosition(points, t, interpolation = 'linear') {
    if (!points || points.length === 0) return { x: 0, z: 0 };
    if (points.length === 1) return points[0];

    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    // Total segments in the path
    const segmentCount = points.length - 1;
    if (segmentCount === 0) return points[0];

    // Find which segment we're in
    const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
    const segmentT = (t * segmentCount) - segment;

    if (interpolation === 'smooth' && points.length >= 3) {
      // Catmull-Rom spline interpolation for smooth curves
      // Get 4 control points (with clamping at edges)
      const p0 = points[Math.max(0, segment - 1)];
      const p1 = points[segment];
      const p2 = points[segment + 1];
      const p3 = points[Math.min(points.length - 1, segment + 2)];

      return this._catmullRom(p0, p1, p2, p3, segmentT);
    } else {
      // Linear interpolation
      const p1 = points[segment];
      const p2 = points[segment + 1];

      return {
        x: p1.x + (p2.x - p1.x) * segmentT,
        z: p1.z + (p2.z - p1.z) * segmentT,
      };
    }
  },

  // Catmull-Rom spline interpolation between 4 points
  _catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    // Catmull-Rom basis matrix coefficients
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );

    const z = 0.5 * (
      (2 * p1.z) +
      (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
    );

    return { x, z };
  },

  // Interpolate Y position from vertical curve points
  // Points are {t: 0-1, y: height in meters}
  _interpolateVerticalPosition(points, t, interpolation = 'linear') {
    if (!points || points.length === 0) return 0;
    if (points.length === 1) return points[0].y;

    t = Math.max(0, Math.min(1, t));

    // Find the two points surrounding t
    let p1 = points[0];
    let p2 = points[points.length - 1];

    for (let i = 0; i < points.length - 1; i++) {
      if (t >= points[i].t && t <= points[i + 1].t) {
        p1 = points[i];
        p2 = points[i + 1];
        break;
      }
    }

    // Calculate local t within segment
    const segmentLength = p2.t - p1.t;
    const localT = segmentLength > 0 ? (t - p1.t) / segmentLength : 0;

    if (interpolation === 'smooth' && points.length >= 3) {
      // Find indices for Catmull-Rom
      const i = points.findIndex(p => p === p1);
      const p0 = points[Math.max(0, i - 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Catmull-Rom for Y
      const t2 = localT * localT;
      const t3 = t2 * localT;
      return 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * localT +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );
    }

    // Linear interpolation
    return p1.y + (p2.y - p1.y) * localT;
  },

  _updateAnimationState() {
    const activeAnim = this._getActiveAnimationType();
    if (activeAnim && !this._animationInterval) {
      this._startAnimationLoop();
    } else if (!activeAnim && this._animationInterval) {
      this._stopAnimationLoop();
      // Reset to base transforms when animation stops
      if (this.arNodeRef && this._isMounted) {
        this.arNodeRef.setNativeProps({
          position: this.state.position,
          rotation: this.state.rotation,
          scale: this.state.scale,
        });
      }
    }
  },


  render: function () {
    const isCustom = this.props.modelIDProps.index === -1;
    var modelItem = isCustom ? this.props.modelIDProps : ModelData.getModelArray()[this.props.modelIDProps.index];

    let transformBehaviors = {};
    if (this.state.shouldBillboard) {
      transformBehaviors.transformBehaviors = this.state.shouldBillboard ? "billboardY" : [];
    }

    // If hidden prop is true, force invisible (but keep same element structure to avoid unmount crash)
    const isVisible = this.props.isHidden ? false : this.state.nodeIsVisible;

    // Determine active animation from objectAnimations prop
    const objectAnims = this.props.objectAnimations || {};
    let activeAnimation = null;
    let animationName = null;

    // DEBUG: Uncomment to debug animation issues (causes log spam)
    // console.log('[ModelItemRender] render() objectAnimations:', {
    //   uuid: this.props.modelIDProps.uuid,
    //   objectAnimations: JSON.stringify(this.props.objectAnimations),
    //   hasAnims: Object.keys(objectAnims).length > 0,
    // });

    // Priority order: bounce, pulse, rotate, scale, wiggle, random
    const animOrder = ['bounce', 'pulse', 'rotate', 'scale', 'wiggle', 'random'];
    for (const animType of animOrder) {
      const animData = objectAnims[animType];
      // DEBUG: Uncomment to debug animation detection
      // if (animData) {
      //   console.log('[ModelItemRender] Found anim type:', animType, 'data:', animData, 'active:', animData?.active);
      // }
      if (animData?.active) {
        // For rotate, check which axis
        if (animType === 'rotate') {
          const axis = animData.axis || { x: false, y: true, z: false };
          if (axis.x) animationName = 'rotateX';
          else if (axis.z) animationName = 'rotateZ';
          else animationName = 'rotateY';
        } else {
          animationName = animType;
        }
        activeAnimation = { name: animationName, run: true, loop: true };
        console.log('[ModelItemRender] *** Animation APPLIED ***:', animationName, 'for UUID:', this.props.modelIDProps.uuid);
        break;
      }
    }


    return (

      <ViroNode
        {...transformBehaviors}
        key={this.props.modelIDProps.uuid}
        ref={this._setARNodeRef}
        visible={isVisible}
        position={this.state.position}
        scale={this.state.scale}
        rotation={this.state.rotation}
        dragType="FixedToWorld">

        {/* This SpotLight is placed directly above the 3D Object, directed straight down,
                is responsible for creating "shadows" underneath the object in addition to providing lighting (castsShadow = true, influenceBitMask = this.props.bitMask). 
                The bitMask comes from figment.js where it is calculated each time a new object is added to the scene
                The position of the spotlight is either default or is configured in the data model (ModelItems.js).
                Rest of the props (innerAngle, outerAngle, attenautionDistances, nearZ, farZ) are configured so that
                they create "as tight as possible" spotlight frustrum around the object for optimizing performance
                (see https://docs.viromedia.com/docs/virospotlight1). */}
        {/* 
        <ViroSpotLight
          ref={component => { this.spotLight = component }}
          intensity={modelItem.lighting_mode == "IBL" ? 100 : 1000}
          innerAngle={5}
          outerAngle={20}
          attenuationStartDistance={0.1}
          attenuationEndDistance={22}
          direction={[0, -1, 0]}
          position={[modelItem.spotlight_position_x == undefined ? 0 : modelItem.spotlight_position_x, modelItem.spotlight_position_y == undefined ? 6 : modelItem.spotlight_position_y, modelItem.spotlight_position_z == undefined ? 0 : modelItem.spotlight_position_z]}
          color="#ffffff"
          castsShadow={true}
          influenceBitMask={this.props.bitMask}
          shadowNearZ={.1}
          shadowFarZ={modelItem.shadowfarz == undefined ? 6 : modelItem.shadowfarz * this.state.scale[0]}
          shadowOpacity={.9} />
        */}

        {/* Inner ViroNode for model-specific offset (ground alignment, pivot, etc.).
            This offset is defined in ModelItems.js and must be applied for all models,
            including draft-loaded ones, since the saved outer position doesn't include it. */}
        <ViroNode
          position={modelItem.position || [0, 0, 0]}>
          {/* Render model: bundled OR custom */}
          {(() => {
            // For custom models, use the remote URL directly (ViroReact supports remote GLB)
            let modelSource;
            if (isCustom) {
              // Use remote source directly
              modelSource = modelItem.source;
            } else {
              modelSource = modelItem.obj;
            }

            // Animation config:
            // - For bundled models with animation: use modelItem.animation
            // - For custom GLB files: use default animation (ViroReact auto-discovers embedded anims)
            // - For models without animation: undefined
            let animationConfig = undefined;

            // Check if this is a GLB file (various ways to detect)
            const isGLB = modelItem.type === 'GLB' ||
              modelItem.extension === 'glb' ||
              (modelItem.source?.uri && modelItem.source.uri.toLowerCase().endsWith('.glb')) ||
              (modelItem.uri && modelItem.uri.toLowerCase().endsWith('.glb')) ||
              (modelItem.name && modelItem.name.toLowerCase().endsWith('.glb'));

            if (modelItem.animation) {
              // Bundled model with predefined animation
              animationConfig = { ...modelItem.animation, run: this.state.runAnimation };
              console.log('[ModelItemRender] Using bundled animation:', modelItem.animation.name);
            } else if (isCustom && isGLB) {
              // Custom GLB - try common animation names from 3D software exports
              // Cinema4D default is 'Main', some use 'Take 001', Blender uses 'Action'
              animationConfig = { name: 'Main', delay: 0, loop: true, run: this.state.runAnimation };
              console.log('[ModelItemRender] Custom GLB animation enabled with name "Main" for:', this.props.modelIDProps.uuid);
            } else {
              // DEBUG: Uncomment to debug animation assignment
              // console.log('[ModelItemRender] No animation for:', this.props.modelIDProps.uuid, 'isCustom:', isCustom, 'isGLB:', isGLB, 'type:', modelItem.type, 'extension:', modelItem.extension);
            }

            // Check if model should be hidden (emitter mode with objectVisible = false)
            const hideModelForEmitter = this.props.emitterData?.isEmitter && this.props.emitterData?.objectVisible === false;

            if (hideModelForEmitter) {
              // Don't render the 3D model, only particles will show
              return null;
            }

            return (() => {
              // Build physics body config if dynamic
              const physicsData = this.props.physicsData || {};
              const physicsBody = physicsData.isDynamic ? {
                type: 'Dynamic',
                mass: 1,
                useGravity: (physicsData.gravity ?? 1) !== 0,
                // Apply upward force if negative gravity
                force: (physicsData.gravity ?? 1) < 0 ? [0, Math.abs(physicsData.gravity) * 15, 0] : undefined,
                friction: 0.5,
                restitution: 0.5, // Bounce factor
              } : null;

              return (
                <Viro3DObject
                  source={modelSource}
                  type={modelItem.type}
                  resources={modelItem.resources || []}
                  materials={isCustom ? ["pbr"] : (modelItem.type === 'GLB' ? [this.state.materialName] : modelItem.materials)}
                  scale={this.state.scale}
                  animation={animationConfig}
                  highAccuracyEvents={true}
                  onClickState={this._onClickState(this.props.modelIDProps.uuid)}
                  onPinch={this._onPinch}
                  onRotate={this._onRotate}
                  onDrag={this._onDrag}
                  dragType="FixedToWorld"
                  onError={this._onError(this.props.modelIDProps.uuid)}
                  onLoadStart={this._onObjectLoadStart(this.props.modelIDProps.uuid)}
                  onLoadEnd={this._onObjectLoadEnd(this.props.modelIDProps.uuid)}
                  lightReceivingBitMask={this.props.bitMask | 1}
                  physicsBody={physicsBody}
                  viroTag={this.props.modelIDProps.uuid}
                  onCollision={physicsData.isDynamic ? (tag, point, normal) => {
                    console.log('[Physics] Collision:', tag, point, normal);
                  } : undefined}
                />
              );
            })()
          })()}



          {/* Artifact Logic - Title Label */}
          {modelItem.artifact && modelItem.artifact.isArtifact && (
            <ViroText
              text={modelItem.artifact.title || "Artifact"}
              scale={[0.2, 0.2, 0.2]}
              position={[0, 0.6, 0]}
              transformBehaviors={["billboard"]}
            />
          )}

          {/* Artifact Logic - Floating Diamond Icon */}
          {modelItem.artifact && modelItem.artifact.isArtifact && (
            <ViroText
              text="💎"
              scale={[0.3, 0.3, 0.3]}
              position={[0, 0.9, 0]}
              style={styles.artifactIconStyle}
              transformBehaviors={["billboard"]}
              animation={{ name: "rotate", run: true, loop: true }}
            />
          )}

          {/* Particle Emitter - renders particles when emitter is active */}
          {this.props.emitterData?.isEmitter && (
            <ViroParticleEmitter
              position={[0, 0.3, 0]}
              duration={-1}
              visible={true}
              run={true}
              loop={true}
              fixedToEmitter={true}

              image={{
                source: this.props.emitterData?.spriteUri
                  ? { uri: this.props.emitterData.spriteUri }
                  : require('../res/particle_snow.png'),
                height: 0.06,
                width: 0.06,
                bloomThreshold: 0.5,
              }}

              spawnBehavior={{
                particleLifetime: [4500, 5500],
                emissionRatePerSecond: [12, 18],
                spawnVolume: {
                  shape: "box",
                  params: [0.2, 0.1, 0.2],
                  spawnOnSurface: false
                },
                maxParticles: 100,
              }}

              particleAppearance={{
                opacity: {
                  initialRange: [0.0, 0.0],
                  factor: "time",
                  interpolation: [
                    { endValue: 1.0, interval: [0, 200] },
                    { endValue: 1.0, interval: [200, 4000] },
                    { endValue: 0.0, interval: [4000, 5000] }
                  ]
                },
                rotation: {
                  initialRange: [0, 360],
                  factor: "time",
                  interpolation: [
                    { endValue: 540, interval: [0, 5000] }
                  ]
                },
                scale: {
                  initialRange: [[0.7, 0.7, 0.7], [1.3, 1.3, 1.3]],
                  factor: "time",
                  interpolation: [
                    { endValue: [1.0, 1.0, 1.0], interval: [0, 1000] },
                    { endValue: [0.3, 0.3, 0.3], interval: [4000, 5000] }
                  ]
                },
              }}

              particlePhysics={{
                velocity: {
                  initialRange: [[-0.15, 0.05, -0.15], [0.15, 0.2, 0.15]]
                },
                acceleration: {
                  initialRange: [[0, -0.3, 0], [0, -0.5, 0]]
                }
              }}
            />
          )}

        </ViroNode>

        {/* Render nested children inside this ViroNode for true parent-child transform inheritance */}
        {this.props.childrenToRender && this.props.childrenToRender.length > 0 && (
          this.props.childrenToRender
        )}
      </ViroNode>
    );
  },

  _setARNodeRef(component) {
    this.arNodeRef = component;
  },

  /**
   * This method handles various state changes that happen when a user "Clicks" a model in the scene. For every "click" on a model, 
     a user can have different intentions:
     1. a quick tap to start/stop animation
     2. a quick tap to bring up the contextmenu
     3. a long tap where the intention is actually "drag" the model to reposition it
     Each "click" is comprised of two events - ClickDown : trigged when the user's finger touches the screen and a ClickUp: when the finger leaves the screen
   */
  _onClickState(uuid) {
    return (clickState, position, source) => {
      console.log('[ModelItemRender] _onClickState:', {
        uuid,
        clickState,
        position,
        itemClickedDown: this.state.itemClickedDown,
      });
      if (clickState == 1) {
        // clickState == 1 -> "ClickDown", we set the state itemClickedDown = true here,
        // which gets "reset" in 200 miliseconds. If a "ClickUp" happens in these 200 ms then
        // the user most likely just wanted to click the model (handled in the clickState == 2). 
        //After 200 ms, most likely the user intended to "drag" the object.
        if (this._isMounted) {
          this.setState({
            itemClickedDown: true,
          });
        }
        TimerMixin.setTimeout(
          () => {
            if (this._isMounted) {
              this.setState({
                itemClickedDown: false,
              });
            }
          },
          200
        );
      }

      if (clickState == 2) { // clickstate == 2 -> "ClickUp"
        console.log('[ModelItemRender] ClickUp detected, itemClickedDown:', this.state.itemClickedDown);
        // As explained above, within 200 ms, the user's intention is to "tap" the model -> toggle the animation start/stop
        if (this.state.itemClickedDown) {
          { this._onItemClicked() }
        }
        // Irrespective of 200 ms, we call the callback provided in props -> this brings up the context menu on top right
        console.log('[ModelItemRender] Calling onClickStateCallback with uuid:', uuid);
        this.props.onClickStateCallback(uuid, clickState, UIConstants.LIST_MODE_MODEL);
      }
    }
  },
  _onItemClicked() {
    if (!this._isMounted) return;
    this.setState({
      itemClickedDown: false,
    });
  },


  /*
   Drag handler - ViroReact provides dragToPos and source.
   ViroReact API: onDrag(dragToPos, source)
   - dragToPos: [x, y, z] array of the current drag position
   - source: drag event source (ViroNode always sends 1, not distinct start/drag/end states)
   
   Since ViroNode doesn't send distinct drag states, we sync position on every drag event.
   */
  _onDrag(dragToPos, source) {
    console.log('[ModelItemRender] _onDrag:', { position: dragToPos, uuid: this.props.modelIDProps.uuid });
    if (!this._isMounted) return;
    if (!dragToPos || !Array.isArray(dragToPos)) return;

    // Store pending position for consistency with other gestures
    this._pendingPosition = dragToPos;

    // Use setNativeProps for smooth visual updates (no React re-render)
    if (this.arNodeRef) {
      this.arNodeRef.setNativeProps({ position: dragToPos });
    }

    // Throttle Redux updates to avoid overwhelming the store
    // Sync every 150ms at most (balance between performance and responsiveness)
    const now = Date.now();
    if (!this._lastDragSync || now - this._lastDragSync > 150) {
      this._lastDragSync = now;

      // IMPORTANT: Use pending values for scale/rotation to prevent resetting them
      const currentScale = this._pendingScale || this.state.scale;
      const currentRotation = this._pendingRotation || this.state.rotation;

      // Sync to Redux for serialization
      if (this.props.onTransformUpdate) {
        this.props.onTransformUpdate(this.props.modelIDProps.uuid, {
          scale: currentScale,
          position: dragToPos,
          rotation: currentRotation,
        });
      }
    }
  },

  /*
   Rotation should be relative to its current rotation *not* set to the absolute
   value of the given rotationFactor.
   Note: rotationFactor from ViroReact is the cumulative rotation since gesture start.
   */
  _onRotate(rotateState, rotationFactor, source) {
    console.log('[ModelItemRender] _onRotate:', { rotateState, rotationFactor, uuid: this.props.modelIDProps.uuid });
    if (!this._isMounted) return;

    // State 1 or first event: Capture initial rotation
    // Use pending value if available (React state might be stale after previous gesture)
    if (rotateState === 1 || this._initialRotationY === null || this._initialRotationY === undefined) {
      const currentRotation = this._pendingRotation || this.state.rotation;
      this._initialRotationY = currentRotation[1];
    }

    // State 3: Rotation Ended - just sync to Redux for data, don't touch visual
    if (rotateState === 3) {
      // Use the last visual value we showed, or fall back to current state
      const finalRotation = this._pendingRotation || this.state.rotation;
      // IMPORTANT: Use pending scale if a pinch is in progress
      const currentScale = this._pendingScale || this.state.scale;

      // Just sync to Redux for data persistence - NO setState, visual is already correct
      if (this.props.onTransformUpdate) {
        this.props.onTransformUpdate(this.props.modelIDProps.uuid, {
          scale: currentScale,
          position: this.state.position,
          rotation: finalRotation,
        });
      }

      this._initialRotationY = null;
      // Keep _pendingRotation for next gesture start and overlapping gesture handlers
      this._pendingRotation = finalRotation;
      this.props.onClickStateCallback(this.props.modelIDProps.uuid, rotateState, UIConstants.LIST_MODE_MODEL);
      return;
    }

    // Calculate current rotation for ongoing gesture (states 1 and 2)
    const currentRotationY = (this._initialRotationY || 0) + rotationFactor;
    const baseRotation = this._pendingRotation || this.state.rotation;
    const newRotation = [baseRotation[0], currentRotationY, baseRotation[2]];

    // Store the visual value we're showing
    this._pendingRotation = newRotation;

    // Use setNativeProps for smooth visual updates
    if (this.arNodeRef) {
      this.arNodeRef.setNativeProps({ rotation: newRotation });
    }
  },

  /*
   Pinch scaling should be relative to its last value *not* the absolute value of the
   scale factor. So while the pinching is ongoing set scale through setNativeProps
   and multiply the state by that factor. At the end of a pinch event, set the state
   to the final value and store it in state.
   */
  _onPinch(pinchState, scaleFactor, source) {
    console.log('[ModelItemRender] _onPinch:', { pinchState, scaleFactor, uuid: this.props.modelIDProps.uuid });
    if (!this._isMounted) return;

    // State 1 or first event: Capture initial scale
    // Use pending value if available (React state might be stale after previous gesture)
    if (pinchState === 1 || !this._initialPinchScale) {
      this._initialPinchScale = this._pendingScale || this.state.scale;
    }

    // State 3: Pinch Ended - just sync to Redux for data, don't touch visual
    if (pinchState === 3) {
      // Use the last visual value we showed, or fall back to current state
      const finalScale = this._pendingScale || this.state.scale;
      // IMPORTANT: Use pending rotation if a rotate is in progress
      const currentRotation = this._pendingRotation || this.state.rotation;

      console.log('[ModelItemRender] Pinch ENDED - syncing to Redux:', {
        uuid: this.props.modelIDProps.uuid,
        finalScale: finalScale,
      });

      // Just sync to Redux for data persistence - NO setState, visual is already correct
      if (this.props.onTransformUpdate) {
        this.props.onTransformUpdate(this.props.modelIDProps.uuid, {
          scale: finalScale,
          position: this.state.position,
          rotation: currentRotation,
        });
      }

      this._initialPinchScale = null;
      // Keep _pendingScale for next gesture start and overlapping gesture handlers
      this._pendingScale = finalScale;
      this.props.onClickStateCallback(this.props.modelIDProps.uuid, pinchState, UIConstants.LIST_MODE_MODEL);
      return;
    }

    // Calculate new scale for ongoing gesture (states 1 and 2)
    const newScale = this._initialPinchScale.map((x) => x * scaleFactor);

    // Store the visual value we're showing
    this._pendingScale = newScale;

    // Use setNativeProps for smooth visual updates
    if (this.arNodeRef) {
      this.arNodeRef.setNativeProps({ scale: newScale });
    }
  },

  _onError(uuid) {
    return () => {
      console.log('[ModelItemRender] Error loading model:', uuid);
      this.props.onLoadCallback(uuid, LoadConstants.ERROR);
      //this.props.arSceneNavigator.viroAppProps.loadingObjectCallback(index, LoadingConstants.LOAD_ERROR);
    };
  },

  _onObjectLoadStart(uuid) {
    return () => {
      this.props.onLoadCallback(uuid, LoadConstants.LOADING);
    };
  },

  _onObjectLoadEnd(uuid) {
    return () => {
      console.log('[ModelItemRender] Model loaded:', uuid);
      this.props.onLoadCallback(uuid, LoadConstants.LOADED);

      // Check if model is loaded from draft - if so, skip placement and auto-scale
      // Use explicit isFromDraft flag (set by LOAD_SCENE reducer)
      const isLoadedFromDraft = this.props.modelIDProps.isFromDraft === true;

      if (isLoadedFromDraft) {
        // Draft-loaded models already have their position/scale set from getInitialState
        // Just make them visible without running hit test placement
        console.log('[ModelItemRender] Draft-loaded model, skipping hit test placement');
        this.setState({
          shouldBillboard: false,
          nodeIsVisible: true,
        });
        return;
      }

      // Only do hit test placement for NEW models
      this.props.hitTestMethod(this._onARHitTestResults);

      // Auto-scale custom models to fit ~60% of viewport
      if (this.props.modelIDProps.index === -1) {
        this._autoScaleModel();
      }
    };
  },

  _autoScaleModel(attempt = 0) {
    // If ref is missing, retry up to 5 times (1 second total)
    if (!this.arNodeRef) {
      if (attempt < 5) {
        console.log(`[ModelItemRender] No ref for auto-scale, retrying... (${attempt + 1}/5)`);
        this.setTimeout(() => {
          this._autoScaleModel(attempt + 1);
        }, 200);
      } else {
        console.warn('[ModelItemRender] Failed to auto-scale: ref never became available.');
      }
      return;
    }

    // Slight delay to ensure geometry is ready for bounding box check
    this.setTimeout(() => {
      // ViroNode doesn't always support getBoundingBoxAsync directly in all versions,
      // but if it does, this is the way. If not, we might need a fallback.
      // Assuming ViroNode or the inner Viro3DObject (which we don't have a direct ref to easily) supports it.
      // Actually, we set this.arNodeRef to the ViroNode.
      if (this.arNodeRef.getBoundingBoxAsync) {
        this.arNodeRef.getBoundingBoxAsync().then((boundingBox) => {
          const { min, max } = boundingBox;
          const width = max[0] - min[0];
          const height = max[1] - min[1];
          const depth = max[2] - min[2];

          const maxDim = Math.max(width, height, depth);

          // Target size: ~0.6 meters (rough approximation of 60% viewport at 1m distance)
          const targetSize = 0.6;

          if (maxDim > 0) {
            const scaleFactor = targetSize / maxDim;
            console.log(`[ModelItemRender] Auto-scaling model. MaxDim: ${maxDim}, ScaleFactor: ${scaleFactor}`);

            this.setState({
              scale: [scaleFactor, scaleFactor, scaleFactor]
            });
          }
        }).catch(err => {
          console.warn('[ModelItemRender] Failed to get bounding box for auto-scale:', err);
        });
      }
    }, 200);
  },

  _onARHitTestResults(position, forward, results) {
    // default position is just 3 forward of the user
    let newPosition = [forward[0] * 1.5, forward[1] * 1.5, forward[2] * 1.5];

    // try to find a more informed position via the hit test results
    if (results.length > 0) {
      let hitResultPosition = undefined;
      // Go through all the hit test results, and find the first AR Point that's close to the position returned by the AR Hit Test
      // We'll place our object at that first point
      for (var i = 0; i < results.length; i++) {
        let result = results[i];
        if (result.type == "ExistingPlaneUsingExtent" || result.type == "FeaturePoint" && !hitResultPosition) {
          // Calculate distance of the "position" from this hit test result
          // math = Sqr root {(x1 - x2) ^ 2 + (y1 - y2) ^ 2 + (z1 - z2) ^ 2} ->regular "distance" calculation
          var distance = Math.sqrt(((result.transform.position[0] - position[0]) * (result.transform.position[0] - position[0])) + ((result.transform.position[1] - position[1]) * (result.transform.position[1] - position[1])) + ((result.transform.position[2] - position[2]) * (result.transform.position[2] - position[2])));
          if (distance > .2 && distance < 10) {
            hitResultPosition = result.transform.position;
            break;
          }
        }
      }

      // If we found a hitResultPosition above after doing the distance math, set the position to this new place
      if (hitResultPosition) {
        newPosition = hitResultPosition;
      }
    }

    this._setInitialPlacement(newPosition);
  },

  _setInitialPlacement(position) {
    if (!this._isMounted) return;
    this.setState({
      position: position,
    });
    this.setTimeout(() => { this._updateInitialRotation() }, 500);
  },

  _updateInitialRotation() {
    if (!this._isMounted) return;
    // If we don't have the ref yet, just make it visible without rotation adjustment
    if (!this.arNodeRef) {
      console.log('[ModelItemRender] _updateInitialRotation - No ref, making visible anyway');
      this.setState({
        shouldBillboard: false,
        nodeIsVisible: true,
      });
      // Sync current transforms to Redux (only for NEW models, not draft-loaded)
      if (!this._hasInitialSynced && this.props.modelIDProps.isFromDraft !== true) {
        this._hasInitialSynced = true;
        this._syncTransformToRedux();
      }
      return;
    }
    this.arNodeRef.getTransformAsync().then((retDict) => {
      if (!this._isMounted) return;
      let rotation = retDict.rotation;
      let absX = Math.abs(rotation[0]);
      let absZ = Math.abs(rotation[2]);

      let yRotation = (rotation[1]);

      // if the X and Z aren't 0, then adjust the y rotation.
      if (absX > 1 && absZ > 1) {
        yRotation = 180 - (yRotation);
      }
      const newRotation = [0, yRotation, 0];
      this.setState({
        rotation: newRotation,
        shouldBillboard: false,
        nodeIsVisible: true,
      });
      // Sync final transforms to Redux after placement (only for NEW models)
      if (!this._hasInitialSynced && this.props.modelIDProps.isFromDraft !== true) {
        this._hasInitialSynced = true;
        this._syncTransformToRedux(newRotation);
      }
    }).catch((error) => {
      console.warn('[ModelItemRender] _updateInitialRotation error:', error);
    });
  },

  _syncTransformToRedux(rotation) {
    // Get the ACTUAL world transform from ViroReact's native layer
    // React state position may be stale if drag updated the native position
    if (this.arNodeRef && this.arNodeRef.getTransformAsync) {
      this.arNodeRef.getTransformAsync().then((transform) => {
        console.log('[ModelItemRender] Syncing true world transform:', {
          uuid: this.props.modelIDProps.uuid,
          position: transform.position,
          rotation: transform.rotation,
          scale: this.state.scale,
        });

        if (this.props.onTransformUpdate) {
          this.props.onTransformUpdate(this.props.modelIDProps.uuid, {
            scale: this.state.scale,
            position: transform.position, // True world position from ViroReact
            rotation: rotation || transform.rotation,
          });
        }

        // Also update local state to match
        this.setState({
          position: transform.position,
          rotation: rotation || transform.rotation,
        });
      }).catch((error) => {
        console.warn('[ModelItemRender] getTransformAsync failed, using state:', error);
        // Fallback to state
        if (this.props.onTransformUpdate) {
          this.props.onTransformUpdate(this.props.modelIDProps.uuid, {
            scale: this.state.scale,
            position: this.state.position,
            rotation: rotation || this.state.rotation,
          });
        }
      });
    } else {
      // No ref available, use state
      if (this.props.onTransformUpdate) {
        this.props.onTransformUpdate(this.props.modelIDProps.uuid, {
          scale: this.state.scale,
          position: this.state.position,
          rotation: rotation || this.state.rotation,
        });
      }
    }
  },
});



ViroMaterials.createMaterials({
  pbr: {
    lightingModel: "PBR",
  },
});

// Register animations for Figment AR objects (following Viro documentation)
ViroAnimations.registerAnimations({
  // Bounce animation - sequential: up then down (using additive syntax)
  bounceUp: { properties: { positionY: "+=0.15" }, easing: "EaseInEaseOut", duration: 300 },
  bounceDown: { properties: { positionY: "-=0.15" }, easing: "EaseInEaseOut", duration: 300 },
  bounce: [["bounceUp", "bounceDown"]],

  // Pulse animation (scale) - using additive/multiplicative syntax for scale
  pulseGrow: { properties: { scaleX: "*=1.15", scaleY: "*=1.15", scaleZ: "*=1.15" }, easing: "EaseInEaseOut", duration: 400 },
  pulseShrink: { properties: { scaleX: "/=1.15", scaleY: "/=1.15", scaleZ: "/=1.15" }, easing: "EaseInEaseOut", duration: 400 },
  pulse: [["pulseGrow", "pulseShrink"]],

  // Rotate animations - loopable single rotation (additive)
  rotateY: { properties: { rotateY: "+=45" }, duration: 500 },
  rotateX: { properties: { rotateX: "+=45" }, duration: 500 },
  rotateZ: { properties: { rotateZ: "+=45" }, duration: 500 },

  // Scale animation (oscillating) - using multiplicative for relative scaling
  scaleGrow: { properties: { scaleX: "*=1.3", scaleY: "*=1.3", scaleZ: "*=1.3" }, easing: "EaseInEaseOut", duration: 500 },
  scaleShrink: { properties: { scaleX: "/=1.3", scaleY: "/=1.3", scaleZ: "/=1.3" }, easing: "EaseInEaseOut", duration: 500 },
  scale: [["scaleGrow", "scaleShrink"]],

  // Wiggle animation - sequential: left, right, center (additive rotation)
  wiggleLeft: { properties: { rotateZ: "+=5" }, easing: "EaseInEaseOut", duration: 100 },
  wiggleRight: { properties: { rotateZ: "-=10" }, easing: "EaseInEaseOut", duration: 100 },
  wiggleCenter: { properties: { rotateZ: "+=5" }, easing: "EaseInEaseOut", duration: 100 },
  wiggle: [["wiggleLeft", "wiggleRight", "wiggleCenter"]],

  // Float/random animation - gentle up and down motion
  floatUp: { properties: { positionY: "+=0.05" }, easing: "EaseInEaseOut", duration: 1000 },
  floatDown: { properties: { positionY: "-=0.05" }, easing: "EaseInEaseOut", duration: 1000 },
  random: [["floatUp", "floatDown"]],
});

var styles = StyleSheet.create({
  artifactTextStyle: {
    fontFamily: 'Arial',
    fontSize: 30,
    color: '#ffffff',
    textAlignVertical: 'center',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  artifactIconStyle: {
    fontSize: 40,
    textAlignVertical: 'center',
    textAlign: 'center',
  }
});

module.exports = ModelItemRender;

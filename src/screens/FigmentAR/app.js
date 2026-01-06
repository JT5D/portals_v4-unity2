/**
 * Copyright (c) 2017-present, Viro, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import TimerMixin from 'react-timer-mixin';

import * as LoadingConstants from './redux/LoadingStateConstants';
import * as UIConstants from './redux/UIConstants';
import renderIf from './helpers/renderIf';
import ButtonComponent from './component/ButtonComponent';
import RecordButton from './component/RecordButton';
import ContextMenuButton from './component/ContextMenuButton';
import SuccessAnimation from './component/SuccessAnimation';
import ShareScreenButton from './component/ShareScreenButtonComponent';
import FigmentListView from './component/FigmentListView';
import PhotosSelector from './component/PhotosSelector';
import ARInitializationUI from './component/ARInitializationUI.js';
import ObjectPropertiesPanel from './component/ObjectPropertiesPanel';
import PortalBackgroundPanel from './component/PortalBackgroundPanel';
import ModelLibraryPanel from './component/ModelLibraryPanel';
import PaintPanel from './component/PaintPanel';
import WorldCaptureOverlay from './component/WorldCaptureOverlay';
import TextTo3DModal from './component/TextTo3DModal';
import * as ModelData from './model/ModelItems';
import * as PortalData from './model/PortalItems';
import * as LightingData from './model/LightingItems';
import {
  addPortalWithIndex, removePortalWithUUID, addModelWithIndex, addCustomModel, removeAll, removeModelWithUUID, toggleEffectSelection, changePortalLoadState, changePortalPhoto, changeModelLoadState, changeItemClickState, switchListMode, removeARObject, displayUIScreen, changeHdriTheme, ARTrackingInitialized, addMedia, setSceneTitle, setSceneId,
  loadScene,
  updateModelArtifact,
  updateObjectAnimation,
  updatePathAnimation,
  updateVerticalAnimation,
  updateEmitter,
  setObjectParent,
  // Voice command actions
  batchTransformAll,
  arrangeInFormation,
  addModelAtPosition,
  transformObject,
  // Attractor/follower system
  updateAttractorSettings,
  // Physics system
  updatePhysicsSettings,
} from './redux/actions';
import { serializeFigmentScene } from './helpers/FigmentSceneSerializer';
import { useAppStore } from '../../store';
import { saveScene as saveSceneToCloud, loadSceneById } from '../../services/scene';
import { CollaboratorModal } from '../../components/CollaboratorModal';
import { AIEnhancePanel } from '../../components/AIEnhancePanel';
import { generateAIVideo, waitForGeneration, uploadVideoForAI, uploadAssetForAI } from '../../services/aiVideoService';
import VoiceComposerButton from './component/VoiceComposerButton';

const kObjSelectMode = 1;
const kPortalSelectMode = 2;
const kEffectSelectMode = 3;

const kPreviewTypePhoto = 1;
const kPreviewTypeVideo = 2;


import {
  AppRegistry,
  Text,
  View,
  StyleSheet,
  PixelRatio,
  Image,
  TouchableHighlight,
  TouchableOpacity,
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Button,
  StatusBar,
  PermissionsAndroid,
  Platform,
  ScrollView,
} from 'react-native';
// Safe import for CameraRoll - allows app to run even if native module isn't available
let CameraRoll;
try {
  CameraRoll = require('@react-native-camera-roll/camera-roll').CameraRoll;
} catch (e) {
  console.warn('[App] CameraRoll native module not available. Save to camera roll will be disabled.');
  CameraRoll = {
    save: () => Promise.reject(new Error('CameraRoll not available')),
  };
}

import {
  ViroARSceneNavigator,
  ViroRecordingErrorConstants,
} from '@reactvision/react-viro';

import Share from 'react-native-share';
import Video from 'react-native-video';
import { Svg, Circle, Line } from 'react-native-svg';
import { NativeModules, findNodeHandle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { requestRecordingPermissionsAsync } from 'expo-audio';

// Import Expo ArViewRecorder module
import ArViewRecorder from '../../../modules/ar-view-recorder';

const { VideoMerger } = NativeModules;

// Debug: Log ArViewRecorder module
console.log('[App] ArViewRecorder:', ArViewRecorder);

// Recording constants
const MAX_DURATION = 30000; // 30 seconds max recording time

// AR Scene that's rendered on the MAIN Screen. App state changes propagate to figment.js via redux 
var InitialScene = require('./figment');
/**
 * Entry point of the app. This class also connects and orchestrates the interaction between 2D UI component and 3D Viro components using redux
 */
export class App extends Component {

  constructor(props) {
    super(props);

    this._renderShareScreen = this._renderShareScreen.bind(this);
    this._renderRecord = this._renderRecord.bind(this);
    this.handleRecordPressIn = this.handleRecordPressIn.bind(this);
    this.handleRecordPressOut = this.handleRecordPressOut.bind(this);
    this.handleRecordConfirm = this.handleRecordConfirm.bind(this);
    this.handleRecordCancel = this.handleRecordCancel.bind(this);
    this._setARNavigatorRef = this._setARNavigatorRef.bind(this);
    this._onListItemLoaded = this._onListItemLoaded.bind(this);
    this._onListPressed = this._onListPressed.bind(this);
    this._getListItems = this._getListItems.bind(this);
    this._saveToCameraRoll = this._saveToCameraRoll.bind(this);
    this._renderPhotosSelector = this._renderPhotosSelector.bind(this);
    this._takeScreenshot = this._takeScreenshot.bind(this);
    this._onPhotoSelected = this._onPhotoSelected.bind(this);
    this._onItemClickedInScene = this._onItemClickedInScene.bind(this);
    this._onContextMenuRemoveButtonPressed = this._onContextMenuRemoveButtonPressed.bind(this);
    this._startStopWatch = this._startStopWatch.bind(this);
    this._getLoadingforModelIndex = this._getLoadingforModelIndex.bind(this);
    this._constructListArrayModel = this._constructListArrayModel.bind(this);
    this._onContextClearAll = this._onContextClearAll.bind(this);
    this.requestAudioPermission = this.requestAudioPermission.bind(this);
    this.requestWriteAccessPermission = this.requestWriteAccessPermission.bind(this);
    this.requestReadAccessPermission = this.requestReadAccessPermission.bind(this);
    this._handleRename = this._handleRename.bind(this);
    this._handleSaveDraft = this._handleSaveDraft.bind(this);
    this._handleNewScene = this._handleNewScene.bind(this);
    this._onListPressed = this._onListPressed.bind(this);
    this._handleAIGenerate = this._handleAIGenerate.bind(this);
    this._handleVoiceActions = this._handleVoiceActions.bind(this);

    this.state = {
      currentModeSelected: kObjSelectMode,
      videoUrl: null,
      haveSavedMedia: false,
      playPreview: false,
      viroAppProps: { loadingObjectCallback: this._onListItemLoaded, clickStateCallback: this._onItemClickedInScene },
      showPhotosSelector: false,
      previewType: kPreviewTypeVideo,
      lastSelectedPortalUUID: -1,
      timer: null,
      hours: '00',
      minutes: '00',
      seconds: '00',
      miliseconds: '00',
      recordStartTimeInMillis: 0,
      cameraPermission: false,
      audioPermission: false,
      writeAccessPermission: false,
      readAccessPermission: false,
      screenshot_count: 0,
      recordingProgress: 0, // Current recording progress in ms
      isActivelyRecording: false, // True while finger is held down
      pauseMarkers: [], // Array of pause marker positions (milliseconds)
      showConfirmButtons: false, // Show confirm/delete after recording
      recordingSegments: [], // Array of video segment paths for stitching
      isStitching: false, // Loading state while stitching videos
      // Scrubber UI state
      frameThumbnails: [], // Array of base64 thumbnail images
      scrubberPosition: 0, // Current scrub position (0-1)
      coverFrameIndex: 0, // Selected cover frame index
      isExtractingFrames: false, // Loading state for frame extraction
      videoDuration: 0, // Video duration in seconds
      isMenuOpen: false, // Dropdown menu visibility
      showContextualMenu: false, // Contextual settings menu visibility
      showPortalBackgroundPanel: false,
      showModelLibraryPanel: false, // New state for Model Library Panel // Portal background picker panel visibility
      showTextTo3DModal: false, // Text-to-3D generation modal visibility
      objectAnimations: {}, // { [uuid]: { bounce: { active, intensity }, rotate: { active, intensity, axis }... } }
      isVideoBuffering: false, // Track 360 video buffering state for UI overlay
      showCollaboratorModal: false, // Collaborator invite modal visibility
      // AI Enhancement state
      showAIPanel: false, // AI enhancement panel visibility
      aiPrompt: '', // Current AI prompt
      aiAssets: [], // Up to 4 reference images
      isAIGenerating: false, // Loading state during AI generation
      generatedVideoUrl: null, // URL of AI-generated video
      isAIGenerated: false, // Track if current video is AI-generated
      aiGenerationId: null, // Track current generation task ID
      isGenerating3D: false, // Loading state during 3D generation
      // World mode state
      isWorldMode: false, // True when editing user's world
      worldSceneId: null, // Existing world scene ID for editing
      showWorldCapture: false, // Show world capture overlay
      capturedWorldImage: null, // Captured screenshot for preview
    };

    this._onBackgroundTap = this._onBackgroundTap.bind(this);
    this._onUpdateObjectAnimation = this._onUpdateObjectAnimation.bind(this);
    this._onUpdateObjectArtifact = this._onUpdateObjectArtifact.bind(this);
    this._onUpdatePathAnimation = this._onUpdatePathAnimation.bind(this);
    this._onUpdateVerticalAnimation = this._onUpdateVerticalAnimation.bind(this);
    this._onUpdateEmitter = this._onUpdateEmitter.bind(this);
    this._onTransformUpdate = this._onTransformUpdate.bind(this);
    this._onMediaTransformUpdate = this._onMediaTransformUpdate.bind(this);
    this._onPortalTransformUpdate = this._onPortalTransformUpdate.bind(this);
    this._onAudioTransformUpdate = this._onAudioTransformUpdate.bind(this);
    this._onPortalBackgroundSelected = this._onPortalBackgroundSelected.bind(this);
    this._onVideoBuffering = this._onVideoBuffering.bind(this);
    // Update viroAppProps to include onBackgroundTap
    this.state.viroAppProps = {
      loadingObjectCallback: this._onListItemLoaded,
      clickStateCallback: this._onItemClickedInScene,
      onBackgroundTap: this._onBackgroundTap,
      onUpdateAnimation: this._onUpdateObjectAnimation,
      onTransformUpdate: this._onTransformUpdate,
      onMediaTransformUpdate: this._onMediaTransformUpdate,
      onPortalTransformUpdate: this._onPortalTransformUpdate,
      onAudioTransformUpdate: this._onAudioTransformUpdate,
      onVideoBuffering: this._onVideoBuffering,
      objectAnimations: this.state.objectAnimations, // Include animations for figment.js
    };
  }

  _onTransformUpdate(uuid, transforms) {
    console.log('[App] Model transform update for', uuid, transforms);
    this.props.dispatchUpdateModelTransforms(uuid, transforms);
  }

  _onMediaTransformUpdate(uuid, transforms) {
    console.log('[App] Media transform update for', uuid, transforms);
    this.props.dispatchUpdateMediaTransforms(uuid, transforms);
  }

  _onPortalTransformUpdate(uuid, transforms) {
    console.log('[App] Portal transform update for', uuid, transforms);
    this.props.dispatchUpdatePortalTransforms(uuid, transforms);
  }

  _onAudioTransformUpdate(uuid, transforms) {
    console.log('[App] Audio transform update for', uuid, transforms);
    this.props.dispatchUpdateAudioTransforms(uuid, transforms);
  }

  _onPortalBackgroundSelected(photoSource) {
    // Change the background of the currently selected portal
    const selectedPortalUuid = this.props.currentItemSelectionIndex;
    console.log('[App] Portal background selected:', photoSource, 'for portal:', selectedPortalUuid);

    if (selectedPortalUuid && selectedPortalUuid !== -1) {
      this.props.dispatchChangePortalPhoto(selectedPortalUuid, photoSource);
    } else {
      console.warn('[App] No portal selected for background change');
    }

    // Close the panel
    this.setState({ showPortalBackgroundPanel: false });
  }

  _onVideoBuffering(isBuffering) {
    console.log('[App] Video buffering state changed:', isBuffering);
    this.setState({ isVideoBuffering: isBuffering });
  }

  componentDidMount() {
    // Check if draft data was passed via navigation params
    const { route } = this.props;
    const draftData = route?.params?.draftData;
    const draftTitle = route?.params?.draftTitle;

    // Check if post data was passed for remix
    const postData = route?.params?.postData;
    const isRemix = route?.params?.isRemix;

    if (draftData && typeof draftData === 'object') {
      console.log('[App] Loading draft scene:', draftTitle);
      // Validate draftData has expected structure
      if (draftData.objects && Array.isArray(draftData.objects)) {
        this.props.dispatchLoadScene(draftData);
      } else {
        console.warn('[App] Invalid draftData structure, skipping load:', draftData);
      }

      // Set the scene title if provided
      if (draftTitle) {
        this.props.dispatchSetSceneTitle(draftTitle);
      }

      // CRITICAL: Set the sceneId so saves update the same scene
      const draftId = route?.params?.draftId;
      if (draftId) {
        this.props.dispatchSetSceneId(draftId);
        console.log('[App] SceneId set from draft:', draftId);
      }
    } else if (postData && isRemix && postData.sceneId) {
      // REMIX: Load scene from a published post
      console.log('[App] Loading scene for remix from post:', postData.id);

      // Fetch the scene data from storage
      this._loadRemixScene(postData);
    }

    // Check for world mode
    const isWorldMode = route?.params?.mode === 'world';
    const worldSceneId = route?.params?.worldSceneId;
    if (isWorldMode) {
      console.log('[App] World mode activated, worldSceneId:', worldSceneId);
      this.setState({ isWorldMode: true, worldSceneId });

      // Load existing world scene if editing
      if (worldSceneId) {
        this._loadWorldScene(worldSceneId);
      }
    }
  }

  // Load scene for remix mode
  async _loadRemixScene(postData) {
    try {
      // Fetch scene data using the sceneId
      const sceneData = await loadSceneById(postData.sceneId);

      if (sceneData && sceneData.objects && Array.isArray(sceneData.objects)) {
        console.log('[App] Remix scene loaded, object count:', sceneData.objects.length);
        this.props.dispatchLoadScene(sceneData);

        // Set title with "Remix" prefix
        const originalTitle = sceneData.title || 'Untitled';
        this.props.dispatchSetSceneTitle(`Remix: ${originalTitle}`);

        // DON'T set the sceneId - we want a NEW scene, not to overwrite the original
        // The sceneId will be generated on save

        // Store remix attribution in state for use when publishing
        this.setState({
          remixedFrom: {
            postId: postData.id,
            userId: postData.userId,
            username: postData.user?.username,
            avatar: postData.user?.avatar,
          }
        });

        console.log('[App] Remix attribution set:', this.state.remixedFrom);
      } else {
        console.warn('[App] Invalid or empty scene data for remix');
        Alert.alert('Error', 'Could not load scene for remix');
      }
    } catch (error) {
      console.error('[App] Failed to load remix scene:', error);
      Alert.alert('Error', 'Failed to load scene: ' + error.message);
    }
  }

  // Load existing world scene for editing
  async _loadWorldScene(worldSceneId) {
    try {
      const sceneData = await loadSceneById(worldSceneId);
      if (sceneData && sceneData.objects && Array.isArray(sceneData.objects)) {
        console.log('[App] World scene loaded, object count:', sceneData.objects.length);
        this.props.dispatchLoadScene(sceneData);
        this.props.dispatchSetSceneTitle(sceneData.title || 'My World');
        this.props.dispatchSetSceneId(worldSceneId);
      } else {
        console.warn('[App] Invalid world scene data');
      }
    } catch (error) {
      console.error('[App] Failed to load world scene:', error);
    }
  }

  // Start world capture flow
  _startWorldCapture() {
    this.setState({ showWorldCapture: true, capturedWorldImage: null });
  }

  // Capture world screenshot
  async _captureWorld() {
    try {
      if (this._arNavigator?.sceneNavigator?.takeScreenshot) {
        const screenshot = await this._arNavigator.sceneNavigator.takeScreenshot('world_capture', false);
        if (screenshot?.success && screenshot?.url) {
          const imageUri = 'file://' + screenshot.url;
          this.setState({ capturedWorldImage: imageUri });
          console.log('[App] World screenshot captured:', imageUri);
        }
      }
    } catch (e) {
      console.error('[App] World capture failed:', e);
      Alert.alert('Error', 'Failed to capture screenshot');
    }
  }

  // Confirm and save world
  async _confirmWorld() {
    try {
      const { capturedWorldImage } = this.state;
      if (!capturedWorldImage) return;

      // Serialize scene data
      const arobjects = {
        modelItems: this.props.modelItems,
        portalItems: this.props.portalItems,
        mediaItems: this.props.mediaItems,
        effectItems: this.props.effectItems,
        postProcessEffects: this.props.postProcessEffects,
      };
      const ui = {
        sceneTitle: this.props.sceneTitle || 'My World',
        selectedHdri: this.props.selectedHdri,
      };

      const sceneData = serializeFigmentScene(arobjects, ui);
      sceneData.sceneId = this.state.worldSceneId; // Pass existing ID for update

      console.log('[App] Saving world scene...', sceneData);

      // Save via store
      const result = await useAppStore.getState().saveWorld(sceneData, capturedWorldImage);

      if (result) {
        console.log('[App] World saved successfully:', result);
        this.setState({ showWorldCapture: false, capturedWorldImage: null });

        // Navigate back to profile
        if (this.props.navigation?.navigate) {
          this.props.navigation.navigate('Profile');
        }
      } else {
        Alert.alert('Error', 'Failed to save world');
      }
    } catch (error) {
      console.error('[App] Save world error:', error);
      Alert.alert('Error', 'Failed to save world: ' + error.message);
    }
  }

  // Retake world screenshot
  _retakeWorld() {
    this.setState({ capturedWorldImage: null });
  }

  // Cancel world capture
  _cancelWorldCapture() {
    this.setState({ showWorldCapture: false, capturedWorldImage: null });
  }

  componentWillUnmount() {
    // IMPORTANT: Do NOT call dispatchRemoveAll() here!
    // ViroReact native components are already being deallocated during unmount.
    // Triggering Redux state updates that try to remove AR objects causes a race condition
    // where the native components crash during deallocation.
    // The AR scene cleanup happens automatically when ViroARSceneNavigator unmounts.
    console.log('[App] componentWillUnmount - AR scene will clean up automatically');
  }

  _onBackgroundTap() {
    console.log('[App] _onBackgroundTap called. Current listMode:', this.props.listMode);
    // Dispatch action to hide the menu (set mode to NONE)
    if (this.props.listMode !== UIConstants.LIST_MODE_NONE) {
      console.log('[App] Dispatching LIST_MODE_NONE');
      this.props.dispatchSwitchListMode(UIConstants.LIST_MODE_NONE, '');
    }
    // Close dropdown if open
    if (this.state.isMenuOpen) {
      this.setState({ isMenuOpen: false });
    }
  }

  // Handle animation update for selected object - dispatches to Redux
  _onUpdateObjectAnimation(type, params, active) {
    const uuid = this.props.currentItemSelectionIndex;
    if (uuid === -1) return;

    console.log('[App] Animation update (dispatching Redux):', type, params, active, 'for UUID:', uuid);

    // Build animation data object
    const animationData = {
      ...params,
      active,
    };

    // Dispatch Redux action instead of setState
    // This will flow through Redux → figment.js props → ModelItemRender
    this.props.dispatchUpdateObjectAnimation(uuid, type, animationData);
  }

  // Handle artifact update for selected object
  _onUpdateObjectArtifact(data) {
    const uuid = this.props.currentItemSelectionIndex;
    console.log('[App] _onUpdateObjectArtifact CALLED:', {
      data,
      uuid,
      currentSelection: this.props.currentItemSelectionIndex,
      modelItemExists: !!this.props.modelItems[uuid],
    });
    if (uuid === -1) {
      console.warn('[App] _onUpdateObjectArtifact: No selection, aborting');
      return;
    }

    console.log('[App] Dispatching updateModelArtifact for UUID:', uuid);
    // Dispatch to Redux
    this.props.dispatchUpdateModelArtifact(uuid, data);
    console.log('[App] updateModelArtifact dispatched');
  }

  // Handle path animation update for selected object
  _onUpdatePathAnimation(pathData) {
    const uuid = this.props.currentItemSelectionIndex;
    if (uuid === -1) return;

    console.log('[App] Path animation update:', pathData, 'for UUID:', uuid);
    this.props.dispatchUpdatePathAnimation(uuid, pathData);
  }

  // Handle vertical animation update for selected object
  _onUpdateVerticalAnimation(verticalData) {
    const uuid = this.props.currentItemSelectionIndex;
    if (uuid === -1) return;

    console.log('[App] Vertical animation update:', verticalData, 'for UUID:', uuid);
    this.props.dispatchUpdateVerticalAnimation(uuid, verticalData);
  }

  // Handle emitter update for selected object
  _onUpdateEmitter(emitterData) {
    const uuid = this.props.currentItemSelectionIndex;
    if (uuid === -1) return;

    console.log('[App] Emitter update:', emitterData, 'for UUID:', uuid);
    this.props.dispatchUpdateEmitter(uuid, emitterData);
  }

  // Handle attractor settings update for selected object
  _onUpdateAttractor(attractorData) {
    const uuid = this.props.currentItemSelectionIndex;
    if (uuid === -1) return;

    console.log('[App] Attractor update:', attractorData, 'for UUID:', uuid);
    this.props.dispatchUpdateAttractorSettings(uuid, attractorData);
  }

  // Get list of objects that are marked as attractors (for follower selector)
  _getAvailableAttractors() {
    const attractors = [];
    const items = this.props.modelItems || {};
    const animations = this.props.objectAnimations || {};

    Object.keys(items).forEach(uuid => {
      const item = items[uuid];
      const anim = animations[uuid];
      if (anim?.attractor?.isAttractor) {
        attractors.push({
          uuid: uuid,
          name: item.name || 'Object',
        });
      }
    });

    return attractors;
  }

  // Handle physics settings update for selected object
  _onUpdatePhysics(physicsData) {
    const uuid = this.props.currentItemSelectionIndex;
    if (uuid === -1) return;

    console.log('[App] Physics update:', physicsData, 'for UUID:', uuid);
    this.props.dispatchUpdatePhysicsSettings(uuid, physicsData);
  }

  // Handle rename scene
  _handleRename() {
    Alert.prompt(
      "Rename Scene",
      "Enter a new name for your scene",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "OK",
          onPress: (name) => {
            if (name && name.trim()) {
              this.props.dispatchSetSceneTitle(name.trim());
            }
          }
        }
      ],
      "plain-text",
      this.props.sceneTitle || "Untitled Scene"
    );
  }

  // Handle voice composer actions from AI
  _handleVoiceActions(actions) {
    console.log('[App] Voice Actions received:', actions);

    actions.forEach((action) => {
      switch (action.type) {
        case 'ADD_OBJECT':
          // objectIndex corresponds to ModelData index
          const objectIndex = action.objectIndex !== undefined ? action.objectIndex : 0;
          console.log('[App] Adding object at index:', objectIndex, 'position:', action.position);

          // If position is specified, use addModelAtPosition; otherwise use AR hit test
          if (action.position) {
            this.props.dispatchAddModelAtPosition(
              objectIndex,
              action.position,
              action.scale || [0.3, 0.3, 0.3],
              action.rotation || [0, 0, 0]
            );
          } else {
            this.props.dispatchAddModel(objectIndex);
          }
          break;

        case 'SET_ANIMATION':
          // Find object by name or use selected/uuid
          let animUuid = action.uuid;
          if (action.objectName) {
            animUuid = this._findObjectByName(action.objectName);
          } else if (action.uuid === 'selected') {
            animUuid = this.props.currentItemSelectionIndex;
          }

          // If we have a specific UUID, apply to that object
          if (animUuid && animUuid !== -1) {
            console.log('[App] Setting animation:', action.animationType, 'on:', animUuid);
            this.props.dispatchUpdateObjectAnimation(animUuid, action.animationType, {
              active: action.animationActive ?? true,
              speed: action.speed,
            });
          } else {
            // No specific object - apply to ALL objects
            const allUuids = Object.keys(this.props.modelItems || {});
            console.log('[App] Setting animation:', action.animationType, 'on ALL objects:', allUuids.length);
            allUuids.forEach((uuid) => {
              this.props.dispatchUpdateObjectAnimation(uuid, action.animationType, {
                active: action.animationActive ?? true,
                speed: action.speed,
              });
            });
          }
          break;

        case 'ADD_EMITTER':
          // Add particle emitter with preset
          const selectedUuid = this.props.currentItemSelectionIndex;
          if (selectedUuid && selectedUuid !== -1) {
            console.log('[App] Adding emitter preset:', action.emitterPreset, 'to:', selectedUuid);
            this.props.dispatchUpdateEmitter(selectedUuid, {
              preset: action.emitterPreset,
              active: true,
            });
          }
          break;

        case 'CLEAR_SCENE':
          console.log('[App] Clearing scene');
          this.props.dispatchRemoveAll();
          break;

        case 'BATCH_TRANSFORM':
          // Random sizes, positions, or uniform transforms
          console.log('[App] Batch transform:', action.transformType, action.params);
          this.props.dispatchBatchTransformAll(action.transformType, action.params || {});
          break;

        case 'ARRANGE_FORMATION':
          // Ring, grid, line, scatter formations
          console.log('[App] Arrange in formation:', action.formationType, action.params);
          this.props.dispatchArrangeFormation(action.formationType, action.params || {});
          break;

        case 'REMOVE_OBJECT':
          // Find by name or use uuid
          let removeUuid = action.uuid;
          if (action.objectName) {
            removeUuid = this._findObjectByName(action.objectName);
          }
          if (removeUuid) {
            console.log('[App] Removing object:', removeUuid);
            this.props.dispatchRemoveModelWithUUID(removeUuid);
          }
          break;

        case 'TRANSFORM_OBJECT':
          // Direct transform of specific object
          let transformUuid = action.uuid;
          if (action.objectName) {
            transformUuid = this._findObjectByName(action.objectName);
          }
          if (transformUuid) {
            console.log('[App] Transforming object:', transformUuid, action.transforms);
            this.props.dispatchTransformObject(transformUuid, action.transforms);
          }
          break;

        case 'GENERATE_STRUCTURE':
          // Generate complex 3D structures from primitives
          const blockIndex = action.params?.blockIndex || 0; // Default to cube
          const structures = this._generateStructure(action.structureType, action.params, blockIndex);
          console.log('[App] Generating structure:', action.structureType, 'blocks:', structures.length);
          structures.forEach((struct, i) => {
            console.log(`[App] Structure block ${i}:`, {
              position: struct.position,
              scale: struct.scale,
              rotation: struct.rotation
            });
            this.props.dispatchAddModelAtPosition(
              struct.index,
              struct.position,
              struct.scale,
              struct.rotation
            );
          });
          break;

        default:
          console.log('[App] Unknown voice action:', action.type);
      }
    });
  }

  // Generate structure presets (igloo, wall, tower, pyramid, stairs)
  _generateStructure(structureType, params, blockIndex) {
    const blocks = [];
    const scale = params?.scale || [0.25, 0.25, 0.25];

    switch (structureType) {
      case 'igloo':
        // Dome of blocks using spherical coordinates
        const radius = params?.radius || 1.2;
        const layers = 5;
        for (let layer = 0; layer < layers; layer++) {
          const layerAngle = (layer / layers) * (Math.PI / 2); // 0 to 90 degrees
          const layerRadius = Math.cos(layerAngle) * radius;
          const layerY = Math.sin(layerAngle) * radius;
          const blocksInLayer = Math.max(1, Math.floor(8 * (1 - layer / layers)));

          for (let i = 0; i < blocksInLayer; i++) {
            const angle = (i / blocksInLayer) * Math.PI * 2;
            blocks.push({
              index: blockIndex,
              position: [
                Math.cos(angle) * layerRadius,
                layerY,
                -2 + Math.sin(angle) * layerRadius
              ],
              scale: [...scale], // Fresh copy
              rotation: [0, (angle * 180 / Math.PI), 0]
            });
          }
        }
        break;

      case 'wall':
        const wallWidth = params?.width || 5;
        const wallHeight = params?.height || 3;
        const spacing = 0.3;
        for (let y = 0; y < wallHeight; y++) {
          for (let x = 0; x < wallWidth; x++) {
            blocks.push({
              index: blockIndex,
              position: [(x - wallWidth / 2) * spacing, y * spacing, -2],
              scale: [...scale], // Fresh copy
              rotation: [0, 0, 0]
            });
          }
        }
        break;

      case 'tower':
        const towerHeight = params?.height || 6;
        for (let y = 0; y < towerHeight; y++) {
          blocks.push({
            index: blockIndex,
            position: [0, y * 0.35, -2],
            scale: [...scale], // Fresh copy
            rotation: [0, y * 15, 0] // Slight twist
          });
        }
        break;

      case 'pyramid':
        const pyramidLayers = params?.layers || 4;
        for (let layer = 0; layer < pyramidLayers; layer++) {
          const size = pyramidLayers - layer;
          const yPos = layer * 0.3;
          for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
              blocks.push({
                index: blockIndex,
                position: [
                  (x - size / 2 + 0.5) * 0.32,
                  yPos,
                  -2 + (z - size / 2 + 0.5) * 0.32
                ],
                scale: [...scale], // Fresh copy
                rotation: [0, 0, 0]
              });
            }
          }
        }
        break;

      case 'stairs':
        const steps = params?.steps || 5;
        for (let i = 0; i < steps; i++) {
          blocks.push({
            index: blockIndex,
            position: [i * 0.3, i * 0.2, -2],
            scale: [...scale], // Fresh copy
            rotation: [0, 0, 0]
          });
        }
        break;

      default:
        // Unknown structure - add a single block
        blocks.push({
          index: blockIndex,
          position: [0, 0, -2],
          scale: scale,
          rotation: [0, 0, 0]
        });
    }

    return blocks;
  }

  // Find object UUID by name (case-insensitive partial match)
  _findObjectByName(name) {
    if (!name || !this.props.modelItems) return null;
    const searchName = name.toLowerCase();
    const uuids = Object.keys(this.props.modelItems);
    for (const uuid of uuids) {
      const item = this.props.modelItems[uuid];
      const itemName = (item.name || '').toLowerCase();
      if (itemName.includes(searchName) || searchName.includes(itemName)) {
        return uuid;
      }
    }
    return null;
  }

  // Handle save draft
  async _handleSaveDraft() {
    try {
      // Serialize the current scene from Redux state
      const arobjects = {
        modelItems: this.props.modelItems,
        portalItems: this.props.portalItems,
        mediaItems: this.props.mediaItems,
        effectItems: this.props.effectItems,
        postProcessEffects: this.props.postProcessEffects,
      };
      const ui = {
        sceneTitle: this.props.sceneTitle,
        selectedHdri: this.props.selectedHdri,
      };

      const sceneData = serializeFigmentScene(arobjects, ui);
      console.log('[App] Serialized scene for draft:', sceneData);

      // Check if scene has any content
      if (sceneData.objects.length === 0) {
        Alert.alert('Empty Scene', 'Add some objects before saving a draft.');
        return;
      }

      // Prompt for name if untitled
      const proceedToSave = async (title) => {
        sceneData.title = title;
        sceneData.sceneId = this.props.sceneId || null; // Pass existing sceneId to update, not create new

        // Take a screenshot for cover image (optional, can be null)
        let coverImageUri = null;
        try {
          if (this._arNavigator?.sceneNavigator?.takeScreenshot) {
            const screenshot = await this._arNavigator.sceneNavigator.takeScreenshot('draft_cover', false);
            if (screenshot?.success && screenshot?.url) {
              coverImageUri = 'file://' + screenshot.url;
            }
          }
        } catch (e) {
          console.warn('[App] Screenshot failed:', e);
        }

        // Save to store and get the new sceneId
        const newSceneId = await useAppStore.getState().saveDraft(sceneData, coverImageUri);

        // Dispatch sceneId to Redux so Collaborate button works immediately
        if (newSceneId) {
          this.props.dispatchSetSceneId(newSceneId);
          console.log('[App] sceneId dispatched to Redux:', newSceneId);
        }

        Alert.alert('Draft Saved', `"${title}" has been saved.`, [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to profile/drafts if navigation available
              if (this.props.navigation?.navigate) {
                this.props.navigation.navigate('ProfileGallery', { initialTab: 'drafts' });
              }
            }
          },
          {
            text: 'Continue Editing',
            style: 'cancel'
          }
        ]);
      };

      if (!this.props.sceneTitle || this.props.sceneTitle === 'Untitled Scene') {
        Alert.prompt(
          "Name Your Scene",
          "Enter a name for this draft:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Save",
              onPress: (name) => {
                const title = name?.trim() || 'Untitled Scene';
                this.props.dispatchSetSceneTitle(title);
                proceedToSave(title);
              }
            }
          ],
          "plain-text",
          ""
        );
      } else {
        proceedToSave(this.props.sceneTitle);
      }
    } catch (error) {
      console.error('[App] Save draft error:', error);
      Alert.alert('Save Error', 'Failed to save draft: ' + error.message);
    }
  }

  // Handle new scene
  _handleNewScene() {
    Alert.alert(
      'New Scene',
      'Start a new scene? This will clear all current objects.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Scene',
          style: 'destructive',
          onPress: () => {
            this.props.dispatchRemoveAll();
            this.props.dispatchSetSceneTitle('Untitled Scene');
          }
        }
      ]
    );
  }

  // This render() function renders the AR Scene in <ViroARSceneNavigator> with the <ViroARScene> defined in figment.js
  // Rest of the components in <View> ... </View> render 2D UI components (React-Native)
  render() {
    // Check if recording is in progress (either actively recording or paused but still capturing)
    const isRecordingInProgress = this.state.isActivelyRecording ||
      (this.state.recordingProgress > 0 && !this.state.showConfirmButtons);

    // Check if in view-only mode (from ArtifactViewer) - hide all controls
    const isViewOnly = this.props.route?.params?.viewOnly === true;

    return (
      <View style={localStyles.flex}>
        <StatusBar hidden={true} />

        {/* World Capture Overlay - Full screen overlay for capturing world screenshot */}
        <WorldCaptureOverlay
          visible={this.state.showWorldCapture}
          capturedImage={this.state.capturedWorldImage}
          onCapture={() => this._captureWorld()}
          onConfirm={() => this._confirmWorld()}
          onRetake={() => this._retakeWorld()}
          onCancel={() => this._cancelWorldCapture()}
        />
        {/* CRITICAL: Use memoized viroAppProps from state to prevent AR scene reload */}
        <ViroARSceneNavigator style={localStyles.arView}
          apiKey="YOUR-API-KEY-HERE"
          initialScene={{ scene: InitialScene }}
          ref={this._setARNavigatorRef}
          viroAppProps={this.state.viroAppProps} />

        {/* Header - Close button + Scene Title with dropdown */}
        {!isViewOnly && !isRecordingInProgress && this.props.currentScreen === UIConstants.SHOW_MAIN_SCREEN && (
          <View style={{ position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
            {/* Close button */}
            <TouchableOpacity
              onPress={() => this.props.navigation?.goBack?.()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 20 }}>✕</Text>
            </TouchableOpacity>

            {/* Scene Title + Dropdown */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => this.setState({ isMenuOpen: !this.state.isMenuOpen })}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{this.props.sceneTitle || 'Untitled Scene'}</Text>
                <Ionicons name={this.state.isMenuOpen ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            {/* Video Loading Indicator - top right */}
            {this.state.isVideoBuffering ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                <ActivityIndicator size="small" color="#FFD700" />
                <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>Video Loading</Text>
              </View>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
        )}

        {/* Dropdown Menu */}
        {!isViewOnly && this.state.isMenuOpen && !isRecordingInProgress && this.props.currentScreen === UIConstants.SHOW_MAIN_SCREEN && (
          <View style={{ position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', zIndex: 100 }}>
            <View style={{ backgroundColor: 'rgba(30,30,30,0.95)', borderRadius: 12, overflow: 'hidden', minWidth: 180 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => {
                  this.setState({ isMenuOpen: false });
                  this._handleRename();
                }}
              >
                <Ionicons name="pencil-outline" size={20} color="white" />
                <Text style={{ color: 'white', marginLeft: 12, fontSize: 16 }}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => {
                  this.setState({ isMenuOpen: false });
                  this._handleSaveDraft();
                }}
              >
                <Ionicons name="save-outline" size={20} color="white" />
                <Text style={{ color: 'white', marginLeft: 12, fontSize: 16 }}>Save Draft</Text>
              </TouchableOpacity>
              {this.state.isWorldMode && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,214,10,0.15)' }}
                  onPress={() => {
                    this.setState({ isMenuOpen: false });
                    this._startWorldCapture();
                  }}
                >
                  <Ionicons name="globe-outline" size={20} color="#FFD60A" />
                  <Text style={{ color: '#FFD60A', marginLeft: 12, fontSize: 16, fontWeight: '600' }}>Save World</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => {
                  this.setState({ isMenuOpen: false });
                  // Require scene to be saved/titled before collaborating
                  if (!this.props.sceneTitle || this.props.sceneTitle === 'Untitled Scene' || !this.props.sceneId) {
                    Alert.alert(
                      'Save Scene First',
                      'Please save and name your scene before inviting collaborators.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Save Now', onPress: () => this._handleSaveDraft() }
                      ]
                    );
                  } else {
                    this.setState({ showCollaboratorModal: true });
                  }
                }}
              >
                <Ionicons name="people-outline" size={20} color="white" />
                <Text style={{ color: 'white', marginLeft: 12, fontSize: 16 }}>Collaborate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
                onPress={() => {
                  this.setState({ isMenuOpen: false });
                  this._handleNewScene();
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <Text style={{ color: 'white', marginLeft: 12, fontSize: 16 }}>New Scene</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Object Properties Panel (Artifacts + Animation) - show only when contextual menu is explicitly opened */}
        <ObjectPropertiesPanel
          visible={this.state.showContextualMenu}
          onClose={() => this.setState({ showContextualMenu: false })}
          currentAnimations={this.props.currentItemSelectionIndex !== -1 ? (this.props.objectAnimations[this.props.currentItemSelectionIndex] || {}) : {}}
          currentArtifact={this.props.currentItemSelectionIndex !== -1 && this.props.modelItems[this.props.currentItemSelectionIndex] ? this.props.modelItems[this.props.currentItemSelectionIndex].artifact : undefined}
          onUpdateAnimation={(type, params, active) => this._onUpdateObjectAnimation(type, params, active)}
          onUpdateArtifact={(data) => this._onUpdateObjectArtifact(data)}
          selectedItemName={this.props.currentItemSelectionIndex !== -1 && this.props.modelItems[this.props.currentItemSelectionIndex] ? (this.props.modelItems[this.props.currentItemSelectionIndex].name || 'Object') : undefined}
          currentPosition={this.props.currentItemSelectionIndex !== -1 && this.props.modelItems[this.props.currentItemSelectionIndex] ? this.props.modelItems[this.props.currentItemSelectionIndex].position : [0, 0, -2]}
          currentPathAnimation={this.props.currentItemSelectionIndex !== -1 ? (this.props.objectAnimations[this.props.currentItemSelectionIndex]?.path || null) : null}
          onUpdatePathAnimation={(data) => this._onUpdatePathAnimation(data)}
          currentVerticalAnimation={this.props.currentItemSelectionIndex !== -1 ? (this.props.objectAnimations[this.props.currentItemSelectionIndex]?.vertical || null) : null}
          onUpdateVerticalAnimation={(data) => this._onUpdateVerticalAnimation(data)}
          currentEmitter={this.props.currentItemSelectionIndex !== -1 ? (this.props.objectEmitters?.[this.props.currentItemSelectionIndex] || null) : null}
          onUpdateEmitter={(data) => this._onUpdateEmitter(data)}
          currentAttractor={this.props.currentItemSelectionIndex !== -1 ? (this.props.objectAnimations[this.props.currentItemSelectionIndex]?.attractor || null) : null}
          onUpdateAttractor={(data) => this._onUpdateAttractor(data)}
          availableAttractors={this._getAvailableAttractors()}
          currentPhysics={this.props.currentItemSelectionIndex !== -1 ? (this.props.objectPhysics?.[this.props.currentItemSelectionIndex] || null) : null}
          onUpdatePhysics={(data) => this._onUpdatePhysics(data)}
        />

        {/* Portal Background Panel */}
        <PortalBackgroundPanel
          visible={this.state.showPortalBackgroundPanel}
          onClose={() => this.setState({ showPortalBackgroundPanel: false })}
          onSelectBackground={this._onPortalBackgroundSelected}
        />

        {/* Collaborator Modal */}
        <CollaboratorModal
          visible={this.state.showCollaboratorModal}
          onClose={() => this.setState({ showCollaboratorModal: false })}
          draftId={this.props.sceneId || null}
          draftTitle={this.props.sceneTitle || 'Untitled Scene'}
          currentCollaborators={[]}
        />

        {/* Model Library Panel */}
        <ModelLibraryPanel
          visible={this.state.showModelLibraryPanel}
          onClose={() => this.setState({ showModelLibraryPanel: false })}
          onSelectModel={this._onListPressed}
          onSelectMedia={(item, mediaType) => {
            console.log('[App] onSelectMedia called:', mediaType, item.name);
            // Add media to AR scene
            if (mediaType === 'video' || mediaType === 'images') {
              const source = { uri: item.url };
              const type = mediaType === 'video' ? 'VIDEO' : 'IMAGE';
              // Use stored dimensions to preserve aspect ratio
              // Width is normalized to 1, height is computed from original ratio
              const w = item.width || 1;
              const h = item.height || 1;
              const aspectHeight = h / w;
              this.props.dispatchAddMedia(source, type, 1, aspectHeight);
            } else if (mediaType === 'audio') {
              // Add spatial audio to AR scene
              console.log('[App] Audio selected - adding spatial audio:', item.url);
              const source = { uri: item.url };
              this.props.dispatchAddAudio(source, 'spatial');
            }
          }}
          modelItems={this.props.modelItems}
          onSelectObject={(uuid) => {
            console.log('[App] onSelectObject from Layers:', uuid);
            this.props.dispatchChangeItemClickState(uuid, 'models');
            this.setState({ showModelLibraryPanel: false, showContextualMenu: true });
          }}
          onSetParent={(uuid, parentId) => {
            console.log('[App] onSetParent:', uuid, '->', parentId);
            this.props.dispatchSetObjectParent(uuid, parentId);
          }}
          onDeleteObject={(uuid) => {
            console.log('[App] onDeleteObject:', uuid);
            this.props.dispatchRemoveModelWithUUID(uuid);
          }}
        />

        {/* Text to 3D Generation Modal */}
        <TextTo3DModal
          visible={this.state.showTextTo3DModal}
          onClose={() => this.setState({ showTextTo3DModal: false })}
          onModelGenerated={(model) => {
            console.log('[App] AI Generated model:', model);
            // Add the generated model to the scene
            this.props.dispatchAddCustomModel({
              name: model.name,
              uri: model.modelUrl || model.uri,
              extension: 'glb',
              type: 'GLB',
              source: 'ai_generated',
            });
            this.setState({ showTextTo3DModal: false });
          }}
        />

        {/* AR Initialization animation - hide during recording */}
        {!isRecordingInProgress && (
          <ARInitializationUI style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} />
        )}

        {/* Paint Panel - rendered at root level for full-screen absolute positioning */}
        {this._renderPaintPanel()}

        {/* Voice Composer Button - floating mic in bottom right corner */}
        {!isViewOnly && !isRecordingInProgress && this.props.currentScreen === UIConstants.SHOW_MAIN_SCREEN && (
          <View style={{ position: 'absolute', right: 20, bottom: 50, zIndex: 50 }}>
            <VoiceComposerButton
              onActionsReceived={this._handleVoiceActions}
              sceneContext={{
                objectCount: Object.keys(this.props.modelItems || {}).length,
                selectedUuid: this.props.currentItemSelectionIndex !== -1 ? this.props.currentItemSelectionIndex : undefined,
                objectNames: Object.values(this.props.modelItems || {}).map(item => item.name || 'Unnamed'),
              }}
            />
          </View>
        )}

        {/* 2D UI buttons on top right of the app - hide during recording */}
        {!isViewOnly && !isRecordingInProgress && this._renderContextMenu()}

        {/* 2D UI for sharing rendered after user finishes taking a video / screenshot */}
        {this._renderShareScreen()}

        {/* 2D UI rendered to enable the user changing background for Portals - hide during recording */}
        {!isViewOnly && !isRecordingInProgress && this._renderPhotosSelector()}

        {/* Timeline (Top) - hide on share screen */}
        {!isViewOnly && this.props.currentScreen !== UIConstants.SHOW_SHARE_SCREEN && this._renderRecord()}

        {/* Bottom Controls (Picker + Toolbar + Record Button) - hide on share screen */}
        {!isViewOnly && this.props.currentScreen !== UIConstants.SHOW_SHARE_SCREEN && this._renderBottomControls()}
      </View>
    );
  }

  async requestAudioPermission() {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Use expo-audio for microphone permission
        const { status } = await requestRecordingPermissionsAsync();
        console.log('[App] iOS audio permission status:', status);
        this.setState({
          audioPermission: status === 'granted',
        });
        return status === 'granted';
      } else {
        // Android: Use PermissionsAndroid
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            'title': 'Figment AR Audio Permission',
            'message': 'Figment AR App needs to access your audio ' +
              'so you can record videos with audio of ' +
              'your augmented scenes.'
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        this.setState({
          audioPermission: hasPermission,
        });
        return hasPermission;
      }
    } catch (err) {
      console.warn("[requestAudioPermission] Error:", err);
      return false;
    }
  }

  async requestWriteAccessPermission() {
    if (Platform.OS !== 'android') return;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          'title': 'Figment AR Audio Permission',
          'message': 'Figment AR App needs to access your photos / videos ' +
            'so you can record cool videos and photos of' +
            'your augmented scenes.'
        }
      )
      if (granted == PermissionsAndroid.RESULTS.GRANTED) {
        this.setState({
          writeAccessPermission: true,
        });
      } else {
        this.setState({
          writeAccessPermission: false,
        });
      }
    } catch (err) {
      console.warn("[PermissionsAndroid]" + err)
    }
  }

  async requestReadAccessPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          'title': 'Figment AR Audio Permission',
          'message': 'Figment AR App needs to access your audio ' +
            'so you can view your own images in portals.'
        }
      )
      if (granted == PermissionsAndroid.RESULTS.GRANTED) {
        this.setState({
          readAccessPermission: true,
        });
      } else {
        this.setState({
          readAccessPermission: false,
        });
      }
    } catch (err) {
      console.warn("[PermissionsAndroid]" + err)
    }
  }

  // Context Menu is the collection of three buttons that appear on the top right with "Remove object (or Portal)", "Clear All" and "Photo Selector (Only for Portals)"
  _renderContextMenu() {
    var selectedItemIndex = this.props.currentItemSelectionIndex;
    var clickState = this.props.currentItemClickState;
    var totalHeight = 120;
    if (this.props.currentSelectedItemType != UIConstants.LIST_MODE_PORTAL) {
      totalHeight = 80;
    }
    if (selectedItemIndex != -1 && clickState == 2) {
      // If a valid object (or portal) was clicked, reset the items "click state" after 3.5 seconds 
      // So that the item can "clicked" again.
      // IMPORTANT: Do NOT reset if the user has the properties panel open (showContextualMenu)
      // ALSO: Only set ONE timer per selection (prevents timer stacking on re-renders)
      if (!this.state.showContextualMenu && this._lastAutoDeselectTarget !== selectedItemIndex) {
        this._lastAutoDeselectTarget = selectedItemIndex;
        TimerMixin.setTimeout(
          () => {
            // Clear the guard so future selections can create timers
            this._lastAutoDeselectTarget = null;
            // Double-check the panel isn't open when the timer fires
            if (!this.state.showContextualMenu) {
              console.log('[App] Auto-deselecting after 3.5s timeout');
              this.props.dispatchChangeItemClickState(-1, '', '');
            } else {
              console.log('[App] Skipping auto-deselect: panel is open');
            }
          },
          3500
        );
      }
    }
    return (
      <View style={{ flex: 1, position: 'absolute', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', top: '25%', right: 10, width: 80, height: 220 }}>
        <View style={{ flex: .45, flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', right: 0, top: 20, width: 80 }}>
          {renderIf(this.props.currentItemSelectionIndex != -1 && (!this.state.showPortalBackgroundPanel),
            <ContextMenuButton onPress={this._onContextMenuRemoveButtonPressed}
              stateImageArray={[require("./res/btn_trash.png")]}
              style={localStyles.previewScreenButtons} />
          )}

          {renderIf(this.props.currentItemSelectionIndex != -1 && (!this.state.showPortalBackgroundPanel),
            <ContextMenuButton onPress={this._onContextClearAll}
              stateImageArray={[require("./res/btn_clear_all.png")]}
              style={localStyles.previewScreenButtons} />
          )}

        </View>
        <View style={{ flex: .2, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', width: 80 }}>
          {renderIf(this.props.currentItemSelectionIndex != -1 && (this.props.currentSelectedItemType == UIConstants.LIST_MODE_PORTAL) && (this.state.showPortalBackgroundPanel == false),
            <ContextMenuButton onPress={() => { this.setState({ showPortalBackgroundPanel: true, lastSelectedPortalUUID: this.props.currentItemSelectionIndex }) }}
              stateImageArray={[require("./res/btn_add_pic_v2.png")]}
              style={localStyles.previewScreenButtonsAddPic} />
          )}
        </View>
      </View>

    );
  }

  // Remove button from Context Menu pressed
  _onContextMenuRemoveButtonPressed() {
    var uuid = this.props.currentItemSelectionIndex;
    var itemType = this.props.currentSelectedItemType;

    if (uuid == -1 || this.props.currentItemClickState == '') {
      return;
    }

    // First, reset click state immediately so the context menu disappears
    this.props.dispatchChangeItemClickState(-1, '', '');

    // For portals, also reset load state
    if (itemType == UIConstants.LIST_MODE_PORTAL) {
      if (this.props.portalItems[uuid] && this.props.portalItems[uuid].selected == true) {
        this.props.dispatchChangePortalLoadState(uuid, LoadingConstants.NONE);
      }
      this.setState({
        lastSelectedPortalUUID: -1,
      });
    }

    // Delay the actual removal to give ViroReact time to clean up native resources
    TimerMixin.setTimeout(() => {
      if (itemType == UIConstants.LIST_MODE_MODEL) {
        this.props.dispatchRemoveModelWithUUID(uuid);
      } else if (itemType == UIConstants.LIST_MODE_PORTAL) {
        this.props.dispatchRemovePortalWithUUID(uuid);
      }
    }, 200);
  }

  // Clear All button was pressed
  _onContextClearAll() {
    // First reset click state
    this.props.dispatchChangeItemClickState(-1, '', '');

    Alert.alert(
      "Remove All Objects",
      "Are you sure you want to clear the entire scene?",
      [
        { text: 'Cancel', onPress: () => { } },
        {
          text: 'OK', onPress: () => {
            // Delay the removal
            TimerMixin.setTimeout(() => {
              this.props.dispatchRemoveAll();
            }, 200);
          }
        },
      ],
    );
  }

  // Photo Selector from ContextMenu was pressed
  _renderPhotosSelector() {

    if (this.state.showPhotosSelector == true) {
      // check for read permissions
      if (!this.state.readAccessPermission) {
        this.requestReadAccessPermission();
      }
      var photoSelectorViews = [];
      photoSelectorViews.push(<StatusBar key="statusBarKey" hidden={true} />);
      photoSelectorViews.push(<View key="topPhotoBar" style={localStyles.topPhotoBar}>
        <View style={{ flex: 1, backgroundColor: "#00000000", justifyContent: 'center', alignItems: 'center' }} />
        <Text style={localStyles.photosText}>My Photos</Text>
        <Text onPress={() => { this.setState({ showPhotosSelector: false }) }}
          style={localStyles.doneText}>Done</Text>
      </View>);
      photoSelectorViews.push(<PhotosSelector key="photosSelector" style={localStyles.photosSelectorStyle} rows={2.3} columns={4}
        onPhotoSelected={this._onPhotoSelected} />);
      return photoSelectorViews;
    }
    return null;
  }

  // Photo selected from Photo Selector
  _onPhotoSelected(index, source) {
    this.props.dispatchChangePortalPhoto(this.state.lastSelectedPortalUUID, source);
  }

  // Helper function called while initializing <ViroARSceneNavigator>
  _setARNavigatorRef(ARNavigator) {
    this._arNavigator = ARNavigator;
  }

  // Render UI for Share Screen, shown after taking a video / image screenshot
  _renderShareScreen() {
    if (this.props.currentScreen == UIConstants.SHOW_SHARE_SCREEN) {
      return (
        <View style={localStyles.shareScreenContainerTransparent} >

          {/* If previewType == photo, show the image on share screen*/}
          {renderIf(this.state.previewType == kPreviewTypePhoto,
            <Image source={{ uri: this.state.videoUrl }} style={localStyles.backgroundImage} resizeMethod={'resize'} />)}

          {/* If previewType == video, play the video on share screen*/}
          {/* With react-native-video, if you turn repeat to true and then onEnd pause
            the video, you'll end up with black screen. So we set repeat to false
            and instead seek to 0 when we want to play the video again (seeking will auto start
            the video player too*/}
          {renderIf(this.state.previewType == kPreviewTypeVideo,
            <Video ref={(ref) => { this.player = ref }}
              source={{ uri: this.state.videoUrl }} paused={!this.state.playPreview}
              repeat={false} style={localStyles.backgroundVideo}
              resizeMode="cover"
              onLoad={(data) => { this.setState({ videoDuration: data.duration }); }}
              onEnd={() => { this.setState({ playPreview: false }) }} />
          )}

          {/* Overlay Play button on top of video, after playing it once. Clicking this button would seek video to 0 and play it again */}
          {renderIf(!this.state.playPreview && (this.state.previewType == kPreviewTypeVideo),
            <View style={{
              position: 'absolute', flex: 1, flexDirection: 'column',
              width: 90, top: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center'
            }}>
              <TouchableOpacity onPress={() => { this.player.seek(0); this.setState({ playPreview: true }) }} style={localStyles.previewPlayButtonContainer} underlayColor="#00000000">
                <Image source={require("./res/btn_play.png")} style={localStyles.previewPlayButton} />
              </TouchableOpacity>
            </View>
          )}

          {/* Close button -> Takes user back to main screen */}
          <View style={{ position: 'absolute', left: 20, top: 60, width: 44, height: 44 }}>
            <TouchableOpacity
              onPress={() => { this.props.dispatchDisplayUIScreen(UIConstants.SHOW_MAIN_SCREEN) }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.4)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Premium Bottom Bar with Scrubber */}
          {this._renderVideoScrubber()}

          {/* AI Enhancement Panel */}
          <AIEnhancePanel
            visible={this.state.showAIPanel}
            onClose={() => this.setState({ showAIPanel: false })}
            onGenerate={this._handleAIGenerate}
            isGenerating={this.state.isAIGenerating}
            hasExistingGeneration={this.state.isAIGenerated}
          />
        </View>
      )
    }
  }

  // Premium Apple-style video scrubber component
  _renderVideoScrubber() {
    const { frameThumbnails, isExtractingFrames, scrubberPosition, coverFrameIndex, previewType } = this.state;

    // Only show for video previews
    if (previewType !== kPreviewTypeVideo) {
      return this._renderPhotoBottomBar();
    }

    return (
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 40, // Safe area
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}>
        {/* Frame Thumbnails Strip - Connected, Full Width, Scrubable */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            height: 70,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => this._handleScrubStart(e)}
          onResponderMove={(e) => this._handleScrubMove(e)}
          onResponderRelease={(e) => this._handleScrubEnd(e)}
        >
          {isExtractingFrames ? (
            // Loading skeleton
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Preparing timeline...</Text>
            </View>
          ) : frameThumbnails.length === 0 ? (
            // Empty state
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No preview frames available</Text>
            </View>
          ) : (
            // Actual thumbnails - connected, no gaps
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {frameThumbnails.map((uri, index) => {
                const isSelected = index === coverFrameIndex;
                return (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      height: 70,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: '#007AFF',
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{
                        flex: 1,
                        width: '100%',
                        height: '100%',
                      }}
                      resizeMode="cover"
                    />
                  </View>
                );
              })}
              {/* Scrub indicator */}
              <View style={{
                position: 'absolute',
                left: `${scrubberPosition * 100}%`,
                top: 0,
                bottom: 0,
                width: 3,
                backgroundColor: 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
              }} />
            </View>
          )}
        </View>

        {/* Action Buttons Row - New Layout */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 8,
        }}>
          {/* Left: Enhance with AI / Generate / Edit Generation */}
          <TouchableOpacity
            onPress={() => this.setState({ showAIPanel: true })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: this.state.isAIGenerated ? 'rgba(147,112,219,0.3)' : 'rgb(247, 255, 168)',
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={this.state.isAIGenerated ? '#9370DB' : 'black'}
            />
            <Text style={{
              color: this.state.isAIGenerated ? '#9370DB' : 'black',
              fontSize: 14,
              fontWeight: '600',
              marginLeft: 6,
            }}>
              {this.state.isAIGenerated ? 'Edit Generation' : 'Enhance with AI'}
            </Text>
          </TouchableOpacity>

          {/* Center: Save & Share - Icons Only */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity
              onPress={() => this._saveToCameraRoll()}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={this.state.haveSavedMedia ? 'checkmark-circle' : 'download-outline'}
                size={24}
                color={this.state.haveSavedMedia ? '#34C759' : 'white'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => this._openShareActionSheet()}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Right: Publish to Feed */}
          <TouchableOpacity
            onPress={() => this._handlePublish()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FF3050',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="white" />
            <Text style={{
              color: 'white',
              fontSize: 14,
              fontWeight: '600',
              marginLeft: 6,
            }}>Publish</Text>
          </TouchableOpacity>
        </View>

        {/* AI Generating Indicator - Top Right */}
        {this.state.isAIGenerating && (
          <View style={{
            position: 'absolute',
            top: -60,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 20,
            gap: 10,
          }}>
            <ActivityIndicator size="small" color="rgb(247, 255, 168)" />
            <View>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Generating with AI...</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}>~2 min estimated</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Paint Panel - rendered at root level for full-screen positioning
  _renderPaintPanel() {
    const isPaint = this.props.listMode === UIConstants.LIST_MODE_PAINT;
    const showSelectionUI = !this.state.isActivelyRecording && !this.state.showConfirmButtons && !this.state.showPhotosSelector && !this.state.showPortalBackgroundPanel && !this.state.showModelLibraryPanel && this.props.currentScreen === UIConstants.SHOW_MAIN_SCREEN;
    const shouldShowPaint = showSelectionUI && isPaint;

    if (!shouldShowPaint) return null;
    return <PaintPanel />;
  }

  // Bottom bar for photo previews (simpler)
  _renderPhotoBottomBar() {
    return (
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 40,
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
      }}>
        <TouchableOpacity
          onPress={() => this._saveToCameraRoll()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: this.state.haveSavedMedia ? 'rgba(52,199,89,0.3)' : 'rgba(255,255,255,0.15)',
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 14,
            marginRight: 12,
          }}
        >
          <Ionicons
            name={this.state.haveSavedMedia ? 'checkmark-circle' : 'download-outline'}
            size={22}
            color={this.state.haveSavedMedia ? '#34C759' : 'white'}
          />
          <Text style={{
            color: this.state.haveSavedMedia ? '#34C759' : 'white',
            fontSize: 16,
            fontWeight: '600',
            marginLeft: 8,
          }}>
            {this.state.haveSavedMedia ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => this._openShareActionSheet()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#007AFF',
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 14,
          }}
        >
          <Ionicons name="share-outline" size={22} color="white" />
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
            marginLeft: 8,
          }}>Share</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Set the selected frame as cover
  _setCoverFrame() {
    const { coverFrameIndex, frameThumbnails } = this.state;
    if (frameThumbnails.length > coverFrameIndex) {
      console.log('[App] Cover frame set to index:', coverFrameIndex);
      // TODO: Implement actual cover frame saving logic
      Alert.alert('Cover Set', `Frame ${coverFrameIndex + 1} will be used as the video cover.`);
    }
  }

  // Handle publish button - navigate to PostDetailsScreen (full publish form)
  _handlePublish() {
    const { videoUrl, frameThumbnails, coverFrameIndex } = this.state;
    const { navigation } = this.props;

    // Get cover image from selected frame or first frame
    const coverImage = frameThumbnails.length > 0
      ? frameThumbnails[coverFrameIndex || 0]
      : null;

    // Serialize the current scene
    const arobjects = {
      modelItems: this.props.modelItems,
      portalItems: this.props.portalItems,
      effectItems: this.props.effectItems,
      mediaItems: this.props.mediaItems,
    };
    const ui = {
      sceneTitle: this.props.sceneTitle || 'Untitled Scene',
      selectedHdri: this.props.selectedHdri,
    };
    const scene = serializeFigmentScene(arobjects, ui);

    console.log('[App] Publishing scene with:', {
      hasVideo: !!videoUrl,
      hasCover: !!coverImage,
      objectCount: Object.keys(this.props.modelItems || {}).length,
      sceneObjects: scene.objects?.length || 0,
      hasArtifact: scene.objects?.some(o => o.artifact?.isArtifact),
    });

    // Navigate to PostDetails with full form (tags, channels, people, locations)
    navigation.navigate('PostDetails', {
      videoUri: videoUrl,
      coverImage: coverImage,
      sceneData: scene,
      remixedFrom: this.state.remixedFrom || null, // Pass remix attribution if present
      isAIGenerated: this.state.isAIGenerated, // Flag for AI-generated content
    });
  }

  // Handle AI generation - uploads video, calls API, updates preview with result
  async _handleAIGenerate(prompt, assets) {
    const { videoUrl } = this.state;

    if (!videoUrl) {
      Alert.alert('Error', 'No video to enhance');
      return;
    }

    if (!prompt || prompt.trim().length === 0) {
      Alert.alert('Error', 'Please enter a prompt');
      return;
    }

    // Check video duration (Decart API max is 5 seconds)
    const { videoDuration } = this.state;
    if (videoDuration && videoDuration > 5) {
      Alert.alert(
        'Video Too Long',
        `AI enhancement supports videos up to 5 seconds. Your video is ${Math.round(videoDuration)} seconds. Please record a shorter clip.`
      );
      return;
    }

    console.log('[App] Starting AI generation with prompt:', prompt);
    console.log('[App] Assets count:', assets.length);
    console.log('[App] Video duration:', videoDuration, 'seconds');

    // Close panel and show loading
    this.setState({
      showAIPanel: false,
      isAIGenerating: true,
      aiPrompt: prompt,
      aiAssets: [], // Decart doesn't use assets
    });

    try {
      // Decart API accepts local video directly via multipart upload
      // No need to pre-upload to R2
      console.log('[App] Using local video for Decart:', videoUrl);

      // Start AI generation with Decart
      console.log('[App] Starting Decart AI generation...');
      const result = await generateAIVideo({
        videoUrl: videoUrl, // Local file URI
        prompt: prompt,
      });

      console.log('[App] Generation started, task ID:', result.id);
      this.setState({ aiGenerationId: result.id });

      // Step 4: Poll for completion
      const finalResult = await waitForGeneration(result.id, (status) => {
        console.log('[App] Generation status:', status);
      });

      console.log('[App] Generation complete:', finalResult);

      if (finalResult.output?.video_url) {
        // Step 5: Update video preview with generated video
        this.setState({
          videoUrl: finalResult.output.video_url,
          generatedVideoUrl: finalResult.output.video_url,
          isAIGenerated: true,
          isAIGenerating: false,
          haveSavedMedia: false, // Reset save state
          // Don't reset frame extraction for remote URLs - keep existing thumbnails
        });

        // Skip frame extraction for remote CDN URLs - keep existing thumbnails from original
        // Frame extraction only works with local files
        console.log('[App] AI video from CDN - keeping existing thumbnails');

        Alert.alert('Success!', 'Your AI-enhanced video is ready');
      } else {
        throw new Error('No video URL in generation result');
      }

    } catch (error) {
      console.error('[App] AI generation failed:', error);
      this.setState({
        isAIGenerating: false,
      });
      Alert.alert('Generation Failed', error.message || 'Failed to generate AI video. Please try again.');
    }
  }

  // Extract frames from video for scrubber timeline
  async _extractFramesForScrubber(videoUrl) {
    try {
      console.log('[App] Starting frame extraction for:', videoUrl);

      // Small delay to ensure video file is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      const frameResult = await ArViewRecorder.extractFrames(videoUrl, 12);
      console.log('[App] Frame extraction complete:', JSON.stringify(frameResult));

      if (frameResult && frameResult.frames && frameResult.frames.length > 0) {
        console.log('[App] Setting', frameResult.frames.length, 'thumbnails');
        this.setState({
          frameThumbnails: frameResult.frames,
          isExtractingFrames: false,
        });
      } else {
        console.warn('[App] No frames returned from extraction');
        this.setState({ isExtractingFrames: false });
      }
    } catch (error) {
      console.error('[App] Frame extraction error:', error);
      this.setState({ isExtractingFrames: false });
    }
  }

  // Handle scrub start - pause video and cache initial state
  _handleScrubStart(e) {
    // Cache the timeline layout and starting position
    e.target.measure((x, y, width, height, pageXOffset, pageYOffset) => {
      this._timelineLayout = { width, pageXOffset };
    });
    // Store initial touch position and current scrubber position
    this._scrubStartX = e.nativeEvent.pageX;
    this._scrubStartPosition = this.state.scrubberPosition;
    // Pause video when starting to scrub
    this.setState({ playPreview: false });
  }

  // Handle scrub move - update position based on drag delta (relative movement)
  _handleScrubMove(e) {
    if (!this._timelineLayout || !this._timelineLayout.width) return;

    const { width } = this._timelineLayout;
    // Calculate how much finger has moved since start
    const dragDelta = e.nativeEvent.pageX - this._scrubStartX;
    // Convert to position delta (0-1 range)
    const positionDelta = dragDelta / width;
    // Apply to starting position
    const newPosition = Math.max(0, Math.min(1, this._scrubStartPosition + positionDelta));

    // Update scrubber position and cover frame
    const frameCount = this.state.frameThumbnails.length;
    const frameIndex = Math.floor(newPosition * frameCount);
    const clampedIndex = Math.min(Math.max(0, frameIndex), frameCount - 1);

    // Seek video to this position
    if (this.player && this.state.videoDuration > 0) {
      this.player.seek(newPosition * this.state.videoDuration);
    }

    this.setState({
      scrubberPosition: newPosition,
      coverFrameIndex: clampedIndex,
    });
  }

  // Handle scrub end
  _handleScrubEnd(e) {
    // Video stays paused so user can see frame for poster selection
    this._scrubStartX = null;
    this._scrubStartPosition = null;
  }

  // This menu shows up over the AR view at bottom left side of the screen, centered vertically and consists of 3 buttons
  // to toggle listview contents between Portals, Effects and Objects.


  // Render Top Timeline for Recording
  _renderRecord() {
    // Only render if recording or confirming
    if (!this.state.isActivelyRecording && !this.state.showConfirmButtons) return null;

    const progressSeconds = Math.floor(this.state.recordingProgress / 1000);
    const progressText = `00:${progressSeconds.toString().padStart(2, '0')}`;

    return (
      <View key="record_timeline" style={{ position: 'absolute', backgroundColor: '#00000066', left: 0, right: 0, top: 0, height: 34, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={localStyles.recordingTimeText}>{progressText}</Text>
      </View>
    );
  }

  _onMediaButtonPress = () => {
    console.log('[App] Media button pressed');
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Photo', 'Video'],
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        console.log('[App] ActionSheet option selected:', buttonIndex);
        if (buttonIndex === 1) {
          this._launchPicker('images');
        } else if (buttonIndex === 2) {
          this._launchPicker('videos');
        }
      }
    );
  };

  _launchPicker = async (mediaTypes) => {
    console.log('[App] _launchPicker called with mediaTypes:', mediaTypes);
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypes,
        allowsEditing: false, // Disabled to ensure Videos are selectable
        quality: 1,
      });
      console.log('[App] ImagePicker result:', result.canceled ? 'canceled' : 'selected');

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const type = asset.type === 'video' ? 'VIDEO' : 'IMAGE';
        const source = { uri: asset.uri };

        console.log('[App] _launchPicker: Asset selected:', { type, width: asset.width, height: asset.height });

        // If Image, we can calculate or use getSize
        if (type === 'IMAGE') {
          let width = 1;
          let height = 1;
          if (asset.width && asset.height) {
            height = asset.height / asset.width;
            this._finishAddMedia(source, type, width, height);
          } else {
            // Fallback for Image
            Image.getSize(asset.uri, (w, h) => {
              if (w && h) height = h / w;
              this._finishAddMedia(source, type, width, height);
            }, () => {
              this._finishAddMedia(source, type, width, height);
            });
          }
        } else {
          // VIDEO: If metadata missing, USE PROBE
          if (asset.width && asset.height) {
            let height = asset.height / asset.width;
            this._finishAddMedia(source, type, 1, height);
          } else {
            console.log('[App] Video metadata missing, triggering probe...');
            this.setState({ videoProbeUri: asset.uri });
          }
        }
      }
    } catch (e) {
      console.error('[App] Error:', e);
    }
  };

  _onVideoProbeLoad = (data) => {
    console.log('[App] Video Probe Loaded:', data.naturalSize);
    const { width, height } = data.naturalSize;
    const ratio = (width && height) ? (height / width) : 1.777; // Default to 16:9 vertical if weird

    this._finishAddMedia({ uri: this.state.videoProbeUri }, 'VIDEO', 1, ratio);
    this.setState({ videoProbeUri: null }); // Clear probe
  };

  _onVideoProbeError = (data) => {
    console.warn('[App] Video Probe Failed:', data);
    // Fallback
    this._finishAddMedia({ uri: this.state.videoProbeUri }, 'VIDEO', 1, 1.777);
    this.setState({ videoProbeUri: null });
  };

  _finishAddMedia = (source, type, width, height) => {
    // Dispatch action to add media to the scene
    // Adding a delay to ensure ImagePicker dismisses cleanly before heavy AR render
    setTimeout(() => {
      console.log('[App] _finishAddMedia dispatching:', { width, height });
      this.props.dispatchAddMedia(source, type, width, height); // Pass dimensions
      this.props.dispatchSwitchListMode(UIConstants.LIST_MODE_NONE, '');
    }, 500);
  };


  // Combined Bottom Controls (Picker, Toolbar, Record Button)
  _renderBottomControls() {
    const isPortals = this.props.listMode === UIConstants.LIST_MODE_PORTAL;
    const isEffects = this.props.listMode === UIConstants.LIST_MODE_EFFECT;
    const isModels = this.props.listMode === UIConstants.LIST_MODE_MODEL;
    const isLighting = this.props.listMode === UIConstants.LIST_MODE_LIGHT;
    const isPaint = this.props.listMode === UIConstants.LIST_MODE_PAINT;

    // Check if we should show the non-recording UI (Picker + Toolbar)
    const showSelectionUI = !this.state.isActivelyRecording && !this.state.showConfirmButtons && !this.state.showPhotosSelector && !this.state.showPortalBackgroundPanel && !this.state.showModelLibraryPanel && this.props.currentScreen === UIConstants.SHOW_MAIN_SCREEN;

    const shouldShowPicker = showSelectionUI && (isPortals || isEffects || isModels || isLighting);
    const shouldShowPaint = showSelectionUI && isPaint;

    // SVG Progress logic
    const circumference = 2 * Math.PI * 45;
    const progress = this.state.recordingProgress / MAX_DURATION;
    const strokeDashoffset = circumference * (1 - progress);

    const toggleMode = (mode, title) => {
      // If tapping the already active mode, toggle it OFF (hide menu)
      if (this.props.listMode === mode) {
        this.props.dispatchSwitchListMode(UIConstants.LIST_MODE_NONE, '');
      } else {
        // Otherwise switch to the new mode
        this.props.dispatchSwitchListMode(mode, title);
      }
    };

    return (
      <View style={{ position: 'absolute', bottom: 130, left: 0, right: 0, alignItems: 'center' }}>

        {/* 1. Picker Container - Only show if mode is NOT NONE */}
        {shouldShowPicker && this.props.listMode !== UIConstants.LIST_MODE_NONE && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, paddingVertical: 12, marginBottom: 25, maxWidth: '90%', overflow: 'hidden' }}>
            <FigmentListView items={this._getListItems()} onPress={this._onListPressed} />
          </View>
        )}

        {/* 2. Toolbar */}
        {/* Only show toolbar if NOT recording (verified: this method is only called if !isRecordingInProgress or handled in render) */}
        {!this.state.isActivelyRecording && this.state.recordingProgress === 0 && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: 20,
            backgroundColor: 'transparent',
            paddingVertical: 10,
            borderRadius: 20
          }}>
            {/* Objects Button - Horizontal slider (like Portals/Effects) */}
            <TouchableOpacity
              onPress={() => toggleMode(UIConstants.LIST_MODE_MODEL, UIConstants.LIST_TITLE_MODELS)}
              style={{ alignItems: 'center', marginHorizontal: 12, opacity: this.props.listMode === UIConstants.LIST_MODE_MODEL ? 1 : 0.6 }}
            >
              <Ionicons name="cube-outline" size={32} color="white" style={{ marginBottom: 4 }} />
              <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>Objects</Text>
            </TouchableOpacity>

            {/* Portals Button */}
            <TouchableOpacity
              onPress={() => toggleMode(UIConstants.LIST_MODE_PORTAL, UIConstants.LIST_TITLE_PORTALS)}
              style={{ alignItems: 'center', marginHorizontal: 12, opacity: this.props.listMode === UIConstants.LIST_MODE_PORTAL ? 1 : 0.6 }}
            >
              <Ionicons name="aperture-outline" size={32} color="white" style={{ marginBottom: 4 }} />
              <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>Portals</Text>
            </TouchableOpacity>

            {/* Effects Button */}
            <TouchableOpacity
              onPress={() => toggleMode(UIConstants.LIST_MODE_EFFECT, UIConstants.LIST_TITLE_EFFECTS)}
              style={{ alignItems: 'center', marginHorizontal: 12, opacity: this.props.listMode === UIConstants.LIST_MODE_EFFECT ? 1 : 0.6 }}
            >
              <Ionicons name="sparkles-outline" size={32} color="white" style={{ marginBottom: 4 }} />
              <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>Effects</Text>
            </TouchableOpacity>

            {/* Lighting Button */}
            <TouchableOpacity
              onPress={() => toggleMode(UIConstants.LIST_MODE_LIGHT, UIConstants.LIST_TITLE_LIGHT)}
              style={{ alignItems: 'center', marginHorizontal: 12, opacity: this.props.listMode === UIConstants.LIST_MODE_LIGHT ? 1 : 0.6 }}
            >
              <Ionicons name="sunny-outline" size={32} color="white" style={{ marginBottom: 4 }} />
              <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>Lighting</Text>
            </TouchableOpacity>

            {/* Paint Button */}
            <TouchableOpacity
              onPress={() => toggleMode(UIConstants.LIST_MODE_PAINT, UIConstants.LIST_TITLE_PAINT)}
              style={{ alignItems: 'center', marginHorizontal: 12, opacity: this.props.listMode === UIConstants.LIST_MODE_PAINT ? 1 : 0.6 }}
            >
              <Ionicons name="brush-outline" size={32} color="white" style={{ marginBottom: 4 }} />
              <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>Paint</Text>
            </TouchableOpacity>

            {/* AI Generate Button - Text to 3D */}
            <TouchableOpacity
              onPress={() => this.setState({ showTextTo3DModal: true })}
              style={{ alignItems: 'center', marginHorizontal: 12, opacity: this.state.showTextTo3DModal ? 1 : 0.6 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={32} color="white" style={{ marginBottom: 4 }} />
              <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>Generate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Record/Controls Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 100 }}>
          {/* Left side: Cancel or Contextual */}
          {this.state.showConfirmButtons ? (
            <TouchableOpacity
              key="cancel_button"
              onPress={this.handleRecordCancel}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 20 }}
            >
              <Text style={{ color: 'white', fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key="contextual_button"
              onPress={() => this.setState({ showContextualMenu: !this.state.showContextualMenu })}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 20 }}
            >
              <Ionicons name="settings-outline" size={22} color="white" />
            </TouchableOpacity>
          )}

          {/* Main Record Button - Always visible to allow resume */}
          <TouchableOpacity
            key="record_button"
            onPressIn={this.handleRecordPressIn}
            onPressOut={this.handleRecordPressOut}
            activeOpacity={1}
            disabled={this.state.recordingProgress >= MAX_DURATION}
          >
            <Svg height="100" width="100" viewBox="0 0 100 100">
              {/* Background circle */}
              <Circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.3)" strokeWidth="6" fill="none" />
              {/* Progress ring */}
              {this.state.recordingProgress > 0 && (
                <Circle cx="50" cy="50" r="45" stroke="#FF3050" strokeWidth="6" fill="none"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" rotation="-90" origin="50, 50" />
              )}
              {/* Cut markers */}
              {this.state.pauseMarkers.map((markerDuration, i) => {
                const markerProgress = markerDuration / MAX_DURATION;
                const angle = markerProgress * 360 - 90;
                const rad = (angle * Math.PI) / 180;
                const x1 = 50 + 38 * Math.cos(rad);
                const y1 = 50 + 38 * Math.sin(rad);
                const x2 = 50 + 52 * Math.cos(rad);
                const y2 = 50 + 52 * Math.sin(rad);
                return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="2" />;
              })}
              {/* Inner Circle Red Fill when recording */}
              <Circle cx="50" cy="50" r={this.state.isActivelyRecording ? "35" : "40"} fill="#FF3050" />
            </Svg>
          </TouchableOpacity>

          {/* Right side: Confirm or Filters */}
          {this.state.showConfirmButtons ? (
            <TouchableOpacity
              key="confirm_button"
              onPress={this.handleRecordConfirm}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF3050', justifyContent: 'center', alignItems: 'center', marginLeft: 20 }}
            >
              <Text style={{ color: 'white', fontSize: 24 }}>✓</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key="library_button"
              onPress={() => this.setState({ showModelLibraryPanel: true })}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginLeft: 20 }}
            >
              <Ionicons name="albums-outline" size={22} color="white" />
            </TouchableOpacity>
          )}
        </View>

      </View>
    );
  }

  _takeScreenshot() {
    // check for write permissions, if not then request
    if (!this.state.writeAccessPermission) {
      this.requestWriteAccessPermission();
    }

    this._arNavigator.sceneNavigator.takeScreenshot("figment_still_" + this.state.screenshot_count, false).then((retDict) => {
      if (!retDict.success) {
        if (retDict.errorCode == ViroRecordingErrorConstants.RECORD_ERROR_NO_PERMISSION) {
          this._displayVideoRecordAlert("Screenshot Error", "Please allow camera permissions!" + errorCode);
        }
      }
      let currentCount = this.state.screenshot_count + 1;
      this.setState({
        videoUrl: "file://" + retDict.url,
        haveSavedMedia: false,
        playPreview: false,
        previewType: kPreviewTypePhoto,
        screenshot_count: currentCount,
      });
      this.props.dispatchDisplayUIScreen(UIConstants.SHOW_SHARE_SCREEN);
    });
  }

  // Handle Record Press In - Start or resume recording AR scene when user presses down
  async handleRecordPressIn() {
    // If we're already actively recording (not paused), ignore
    if (this.state.isActivelyRecording) {
      console.log('[App] Already actively recording, ignoring press');
      return;
    }
    if (this.state.recordingProgress >= MAX_DURATION) return;

    // Check and request audio permissions (MUST await before recording)
    if (!this.state.audioPermission) {
      console.log('[App] Requesting audio permission...');
      const granted = await this.requestAudioPermission();
      if (!granted) {
        console.warn('[App] Audio permission denied, cannot record');
        Alert.alert('Permission Required', 'Microphone permission is required to record video.');
        return;
      }
    }

    try {
      // Check if we have an active session that's paused
      if (this._hasActiveSession) {
        // Resume the paused session
        console.log('[App] Resuming paused recording...');
        const result = await ArViewRecorder.resumeRecording();
        console.log('[App] ArViewRecorder.resumeRecording result:', JSON.stringify(result));
      } else {
        // Start a new recording session
        const recordingId = Date.now();
        const recordingFile = `ar_recording_${recordingId}`;
        this._currentRecordingFile = recordingFile;

        console.log('[App] Starting new ArViewRecorder session:', recordingFile);

        if (ArViewRecorder && ArViewRecorder.startRecording) {
          const viewTag = findNodeHandle(this._arNavigator);
          console.log('[App] ViroARSceneNavigator view tag:', viewTag);

          if (viewTag) {
            const result = await ArViewRecorder.startRecording(viewTag, recordingFile);
            console.log('[App] ArViewRecorder.startRecording result:', JSON.stringify(result));
            this._hasActiveSession = true;
          } else {
            console.warn('[App] Could not get view tag for ViroARSceneNavigator');
            throw new Error('Could not get view tag');
          }
        } else {
          console.warn('[App] ArViewRecorder not available');
          throw new Error('ArViewRecorder not available');
        }
      }

      // Track recording start time for this segment
      this._recordingStartTime = Date.now();
      this._isRecording = true;

      // Update visual state
      this.setState({
        isActivelyRecording: true,
        showConfirmButtons: false,
        recordStartTimeInMillis: this._recordingStartTime,
      });

      // Store progress at segment start to add to it
      this._segmentStartProgress = this.state.recordingProgress;

      // Start progress timer with reduced update frequency (200ms) to minimize re-renders during recording
      this._recordingTimer = TimerMixin.setInterval(() => {
        const elapsedThisSegment = Date.now() - this._recordingStartTime;
        const totalProgress = this._segmentStartProgress + elapsedThisSegment;

        if (totalProgress >= MAX_DURATION) {
          this.setState({ recordingProgress: MAX_DURATION });
          this.handleRecordPressOut();
        } else {
          this.setState({ recordingProgress: totalProgress });
        }
      }, 200);

      this.props.dispatchDisplayUIScreen(UIConstants.SHOW_RECORDING_SCREEN);

    } catch (error) {
      console.error('[App] Recording start/resume error:', error);
      this._isRecording = false;
      this._displayVideoRecordAlert("Recording Error", "Could not start/resume recording: " + error.message);
    }
  }

  // Stopwatch at the top while recording
  _startStopWatch() {

    let timer = TimerMixin.setInterval(() => {

      var seconds = (Number(this.state.seconds) + 1).toString(),
        minutes = this.state.minutes,
        hours = this.state.hours;

      if (Number(this.state.seconds) == 59) {
        minutes = (Number(this.state.minutes) + 1).toString();
        seconds = '00';
      }

      if (Number(this.state.minutes) == 59) {
        hours = (Number(this.state.hours) + 1).toString();
        minutes = '00';
        seconds = '00';
      }

      this.setState({
        hours: hours.length == 1 ? '0' + hours : hours,
        minutes: minutes.length == 1 ? '0' + minutes : minutes,
        seconds: seconds.length == 1 ? '0' + seconds : seconds,
      });
    }, 1000);
    this.setState({
      timer: timer,
      recordStartTimeInMillis: (new Date).getTime(),
    });
  }

  // Handle Record Press Out - Pause recording when user lifts finger
  async handleRecordPressOut() {
    if (!this.state.isActivelyRecording) return;

    // Stop progress timer
    if (this._recordingTimer) {
      TimerMixin.clearInterval(this._recordingTimer);
      this._recordingTimer = null;
    }

    // Minimum recording segment time (to avoid accidental taps)
    const MIN_SEGMENT_DURATION = 300; // ms
    const segmentDuration = Date.now() - this.state.recordStartTimeInMillis;

    if (segmentDuration < MIN_SEGMENT_DURATION) {
      const waitTime = MIN_SEGMENT_DURATION - segmentDuration;
      console.log(`[App] Waiting ${waitTime}ms for minimum recording duration...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Pause the recording (keeps session open)
    this._isRecording = false;
    try {
      console.log('[App] Pausing video recording...');

      if (ArViewRecorder && ArViewRecorder.pauseRecording) {
        const result = await ArViewRecorder.pauseRecording();
        console.log('[App] ArViewRecorder.pauseRecording result:', JSON.stringify(result));
      }

      // Add a pause marker at current progress
      this.setState((prevState) => ({
        isActivelyRecording: false,
        pauseMarkers: [...prevState.pauseMarkers, prevState.recordingProgress],
        showConfirmButtons: true,
      }));

    } catch (error) {
      console.error('[App] Pause recording error:', error);
      this.setState({
        isActivelyRecording: false,
        showConfirmButtons: true,
      });
    }
  }

  // Handle confirm button - finalize recording and navigate to share screen
  async handleRecordConfirm() {
    // Check if there's an active recording session to stop
    if (!this._hasActiveSession) {
      Alert.alert('Recording Error', 'No recording session to finalize.');
      this.handleRecordCancel();
      return;
    }

    this.setState({ isStitching: true }); // Show loading indicator

    try {
      console.log('[App] Finalizing recording...');

      // Stop the recording session to get the final video file
      const result = await ArViewRecorder.stopRecording();
      console.log('[App] ArViewRecorder.stopRecording result:', JSON.stringify(result));

      this._hasActiveSession = false;

      // Get the video path
      const videoPath = result.url || result.path;
      if (!videoPath) {
        throw new Error('No video path returned');
      }

      const finalUrl = videoPath.startsWith('file://') ? videoPath : 'file://' + videoPath;
      console.log('[App] Final video:', finalUrl);

      this.setState({
        videoUrl: finalUrl,
        showConfirmButtons: false,
        haveSavedMedia: false,
        playPreview: true,
        previewType: kPreviewTypeVideo,
        recordingProgress: 0,
        pauseMarkers: [],
        isStitching: false,
        isExtractingFrames: true, // Start loading state
        frameThumbnails: [], // Clear previous thumbnails
        coverFrameIndex: 0,
      }, () => {
        this.props.dispatchDisplayUIScreen(UIConstants.SHOW_SHARE_SCREEN);
      });

      // Extract frames for scrubber (moved outside setState callback)
      this._extractFramesForScrubber(finalUrl);
    } catch (error) {
      console.error('[App] Finalize recording error:', error);
      this.setState({ isStitching: false });
      this._hasActiveSession = false;
      Alert.alert('Recording Error', 'Failed to finalize recording: ' + error.message);
    }
  }

  // Handle cancel button - reset state and discard recording
  async handleRecordCancel() {
    // Clear any pending timer
    if (this._recordingTimer) {
      TimerMixin.clearInterval(this._recordingTimer);
      this._recordingTimer = null;
    }

    // Stop and discard any active recording session
    if (this._hasActiveSession) {
      try {
        await ArViewRecorder.stopRecording();
        console.log('[App] Recording session discarded');
      } catch (e) {
        console.log('[App] Error stopping recording on cancel:', e);
      }
      this._hasActiveSession = false;
    }

    this._isRecording = false;

    this.setState({
      recordingProgress: 0,
      pauseMarkers: [],
      showConfirmButtons: false,
      videoUrl: null,
      isActivelyRecording: false,
      isStitching: false,
    });

    this.props.dispatchDisplayUIScreen(UIConstants.SHOW_MAIN_SCREEN);
  }

  _saveToCameraRoll() {
    if (this.state.videoUrl != undefined && !this.state.haveSavedMedia) {
      this.setState({
        haveSavedMedia: true
      })
    }
    CameraRoll.saveToCameraRoll(this.state.videoUrl);
  }

  _displayVideoRecordAlert(title, message) {
    Alert.alert(
      title,
      message,
      [
        { text: 'OK', onPress: () => this.props.dispatchDisplayUIScreen(UIConstants.SHOW_MAIN_SCREEN) },
      ],
      { cancelable: false }
    )
  }

  // Dispatch correct event to redux for adding AR Objects, Portals and Effects in the scene 
  // item can be index (for built-ins) or object (for custom)
  // type is 'starter' or 'personal' or undefined (legacy)
  async _onListPressed(indexOrItem, type) {
    if (this.props.listMode == UIConstants.LIST_MODE_MODEL || type === 'starter' || type === 'personal') {
      if (type === 'personal') {
        console.log("Adding personal model:", indexOrItem);

        // For GLB files, try to discover the actual animation name
        if (indexOrItem.extension?.toLowerCase() === 'glb' && indexOrItem.uri) {
          try {
            const { getFirstGLBAnimationName } = require('./helpers/GLBAnimationParser');
            const animName = await getFirstGLBAnimationName(indexOrItem.uri, 'Main');
            console.log('[App] Discovered GLB animation name:', animName);
            // Add animation data to the model before dispatch
            indexOrItem = {
              ...indexOrItem,
              discoveredAnimationName: animName, // Pass discovered name to reducer
            };
          } catch (error) {
            console.warn('[App] Failed to parse GLB animations, using fallback:', error);
          }
        }

        this.props.dispatchAddCustomModel(indexOrItem);
      } else {
        // 'starter' or legacy list
        this.props.dispatchAddModel(indexOrItem);
      }
    } else if (this.props.listMode == UIConstants.LIST_MODE_PORTAL) {
      this.props.dispatchAddPortal(indexOrItem);
    } else if (this.props.listMode == UIConstants.LIST_MODE_EFFECT) {
      this.props.dispatchToggleEffectSelection(indexOrItem);
    } else if (this.props.listMode == UIConstants.LIST_MODE_LIGHT) {
      var lightingArray = LightingData.getLightingArray();
      this.props.dispatchChangeHdriTheme(lightingArray[indexOrItem].name);
    }
  }

  // Dispath correct event to redux for handling load states of Objects and Portals
  _onListItemLoaded(index, loadState) {
    if (this.props.listMode == UIConstants.LIST_MODE_MODEL) {
      this.props.dispatchChangeModelLoadState(index, loadState);
    }

    if (this.props.listMode == UIConstants.LIST_MODE_PORTAL) {
      this.props.dispatchChangePortalLoadState(index, loadState);
    }
  }

  // When an AR object (Object or Portal) in the scene is clicked; 
  // dispatch this event to redux -> which results in context menu appearing on top left
  _onItemClickedInScene(index, clickState, itemType) {
    console.log('[App] _onItemClickedInScene CALLED:', {
      index,
      clickState,
      itemType,
      currentSelection: this.props.currentItemSelectionIndex,
      showContextualMenu: this.state.showContextualMenu,
    });
    this.props.dispatchChangeItemClickState(index, clickState, itemType);
    // Hide menu when interacting with an object
    if (this.props.listMode !== UIConstants.LIST_MODE_NONE) {
      this.props.dispatchSwitchListMode(UIConstants.LIST_MODE_NONE, '');
    }
  }

  // Load data source for listview based on listview modes
  _getListItems() {
    if (this.props.listMode == UIConstants.LIST_MODE_MODEL) {
      return this._constructListArrayModel(ModelData.getModelArray(), this.props.modelItems);
    } else if (this.props.listMode == UIConstants.LIST_MODE_PORTAL) {
      return this._constructListArrayModel(PortalData.getPortalArray(), this.props.portalItems);
    } else if (this.props.listMode == UIConstants.LIST_MODE_EFFECT) {
      return this.props.effectItems;
    } else if (this.props.listMode == UIConstants.LIST_MODE_LIGHT) {
      return this._constructListArrayModel(LightingData.getLightingArray(), []);
    }
  }

  // Helper to construct listview items
  _constructListArrayModel(sourceArray, items) {
    var listArrayModel = [];
    for (var i = 0; i < sourceArray.length; i++) {
      listArrayModel.push({ icon_img: sourceArray[i].icon_img, loading: this._getLoadingforModelIndex(i, items) })
    }
    return listArrayModel;
  }

  // Helper to determine which listview item to show the Loading spinner if an AR object or portal is being added to the scene
  _getLoadingforModelIndex(index, items) {
    if (items == null || items == undefined) {
      return LoadingConstants.NONE;
    }
    var loadingConstant = LoadingConstants.NONE;

    Object.keys(items).forEach(function (currentKey) {
      if (items[currentKey] != null && items[currentKey] != undefined) {
        if (items[currentKey].loading != LoadingConstants.NONE && items[currentKey].index == index) {
          loadingConstant = items[currentKey].loading;
        }
      }
    });

    return loadingConstant;
  }

  async _openShareActionSheet() {
    let contentType = this.state.previewType == kPreviewTypeVideo ? 'video/mp4' : 'image/png';
    await Share.open({
      subject: "#FigmentAR",
      message: "#FigmentAR",
      url: this.state.videoUrl,
      type: contentType,
    });
  }
}


App.propTypes = {
  objIndex: PropTypes.number.isRequired,
}

App.defaultProps = {
  objIndex: -1,
}

var localStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  arView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topPhotoBar: {
    backgroundColor: '#000000aa',
    height: 50,
    width: '100%',
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {
    textAlign: 'right',
    color: '#d6d6d6',
    fontWeight: 'bold',
    fontFamily: 'Helvetica Neue',
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#00000000',
    flex: 1,
  },
  photosText: {
    textAlign: 'center',
    color: '#d6d6d6',
    fontFamily: 'Helvetica Neue',
    fontSize: 16,
    backgroundColor: '#00000000',
    flex: 1,
  },
  previewScreenButtons: {
    height: 30,
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewScreenButtonsAddPic: {
    height: 32,
    width: 37,
  },
  previewScreenButtonClose: {
    position: 'absolute',
    height: 23,
    width: 23,
  },
  previewScreenButtonShare: {
    position: 'absolute',
    height: 35,
    width: 35,
  },
  screenIcon: {
    position: 'absolute',
    height: 58,
    width: 58,
  },
  recordIcon: {
    position: 'absolute',
    height: 58,
    width: 58,
    top: 10,
    left: 10,
  },
  cameraIcon: {
    position: 'absolute',
    height: 30,
    width: 30,
    top: 25,
    left: 25,
  },
  recordingTimeText: {
    textAlign: 'center',
    color: '#d6d6d6',
    fontFamily: 'Helvetica Neue',
    fontSize: 16,
  },
  previewPlayButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 90,
  },
  previewPlayButton: {
    position: 'absolute',
    height: 90,
    width: 90,
    left: 0,
    alignSelf: 'center',
  },
  previewSavedSuccess: {
    position: 'absolute',
    height: 115,
    width: 100,
    alignSelf: 'center',
  },
  shareScreenContainerTransparent: {
    position: 'absolute',
    flex: 1,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    resizeMode: 'stretch',
  },
  photosSelectorStyle: {
    position: 'absolute',
    width: '100%',
    height: '40%',
    bottom: 0
  }
});

// -- REDUX STORE
function selectProps(store) {
  return {
    modelItems: store.arobjects.modelItems,
    portalItems: store.arobjects.portalItems,
    mediaItems: store.arobjects.mediaItems,
    effectItems: store.arobjects.effectItems,
    postProcessEffects: store.arobjects.postProcessEffects,
    objectAnimations: store.arobjects.objectAnimations, // Animation states from Redux
    objectEmitters: store.arobjects.objectEmitters, // Emitter states from Redux
    objectPhysics: store.arobjects.objectPhysics, // Physics states from Redux
    currentScreen: store.ui.currentScreen,
    listMode: store.ui.listMode,
    listTitle: store.ui.listTitle,
    currentItemSelectionIndex: store.ui.currentItemSelectionIndex,
    currentItemClickState: store.ui.currentItemClickState,
    currentSelectedItemType: store.ui.currentSelectedItemType,
    sceneTitle: store.ui.sceneTitle,
    sceneId: store.ui.sceneId,
    selectedHdri: store.ui.selectedHdri,
  };
}

// -- dispatch REDUX ACTIONS map
const mapDispatchToProps = (dispatch) => {
  return {
    dispatchAddPortal: (index) => dispatch(addPortalWithIndex(index)),
    dispatchRemovePortalWithUUID: (uuid) => dispatch(removePortalWithUUID(uuid)),
    dispatchAddModel: (index) => dispatch(addModelWithIndex(index)),
    dispatchRemoveModelWithUUID: (uuid) => dispatch(removeModelWithUUID(uuid)),
    dispatchRemoveAll: () => dispatch(removeAll()),
    dispatchToggleEffectSelection: (index) => dispatch(toggleEffectSelection(index)),
    dispatchChangeModelLoadState: (index, loadState) => dispatch(changeModelLoadState(index, loadState)),
    dispatchChangePortalLoadState: (index, loadState) => dispatch(changePortalLoadState(index, loadState)),
    dispatchDisplayUIScreen: (uiScreenState) => dispatch(displayUIScreen(uiScreenState)),
    dispatchSwitchListMode: (listMode, listTitle) => dispatch(switchListMode(listMode, listTitle)),
    dispatchChangePortalPhoto: (index, source) => dispatch(changePortalPhoto(index, source)),
    dispatchChangeItemClickState: (index, clickState, itemType) => dispatch(changeItemClickState(index, clickState, itemType)),
    dispatchChangeHdriTheme: (hdri) => dispatch(changeHdriTheme(hdri)),
    dispatchAddMedia: (source, type, width, height) => dispatch(addMedia(source, type, width, height)),
    dispatchSetSceneTitle: (title) => dispatch(setSceneTitle(title)),
    dispatchSetSceneId: (sceneId) => dispatch(setSceneId(sceneId)),
    dispatchLoadScene: (sceneData) => dispatch(loadScene(sceneData)),
    dispatchAddCustomModel: (modelData) => dispatch(addCustomModel(modelData)),
    dispatchUpdateModelTransforms: (uuid, transforms) => dispatch({
      type: 'UPDATE_MODEL_TRANSFORMS',
      uuid,
      position: transforms.position,
      rotation: transforms.rotation,
      scale: transforms.scale,
    }),
    dispatchUpdateMediaTransforms: (uuid, transforms) => dispatch({
      type: 'UPDATE_MEDIA_TRANSFORMS',
      uuid,
      position: transforms.position,
      rotation: transforms.rotation,
      scale: transforms.scale,
    }),
    dispatchUpdatePortalTransforms: (uuid, transforms) => dispatch({
      type: 'UPDATE_PORTAL_TRANSFORMS',
      uuid,
      position: transforms.position,
      rotation: transforms.rotation,
      scale: transforms.scale,
    }),
    dispatchAddAudio: (source, audioType, options = {}) => dispatch({
      type: 'ADD_AUDIO',
      source,
      audioType,
      volume: options.volume,
      loop: options.loop,
      minDistance: options.minDistance,
      maxDistance: options.maxDistance,
      rolloffModel: options.rolloffModel,
    }),
    dispatchRemoveAudio: (uuid) => dispatch({
      type: 'REMOVE_AUDIO',
      uuid,
    }),
    dispatchUpdateAudioTransforms: (uuid, transforms) => dispatch({
      type: 'UPDATE_AUDIO_TRANSFORMS',
      uuid,
      position: transforms.position,
      rotation: transforms.rotation,
      scale: transforms.scale,
    }),
    dispatchRemoveAll: () => dispatch({
      type: 'REMOVE_ALL',
    }),
    dispatchUpdateModelArtifact: (uuid, data) => dispatch(updateModelArtifact(uuid, data)),
    dispatchUpdateObjectAnimation: (uuid, animationType, animationData) => dispatch(updateObjectAnimation(uuid, animationType, animationData)),
    dispatchUpdatePathAnimation: (uuid, pathData) => dispatch(updatePathAnimation(uuid, pathData)),
    dispatchUpdateVerticalAnimation: (uuid, verticalData) => dispatch(updateVerticalAnimation(uuid, verticalData)),
    dispatchUpdateEmitter: (uuid, emitterData) => dispatch(updateEmitter(uuid, emitterData)),
    dispatchSetObjectParent: (uuid, parentId) => dispatch(setObjectParent(uuid, parentId)),
    // Voice command dispatches
    dispatchBatchTransformAll: (transformType, params) => dispatch(batchTransformAll(transformType, params)),
    dispatchArrangeFormation: (formationType, params) => dispatch(arrangeInFormation(formationType, params)),
    dispatchAddModelAtPosition: (index, position, scale, rotation) => dispatch(addModelAtPosition(index, position, scale, rotation)),
    dispatchTransformObject: (uuid, transforms) => dispatch(transformObject(uuid, transforms)),
    // Attractor/follower system
    dispatchUpdateAttractorSettings: (uuid, attractorData) => dispatch(updateAttractorSettings(uuid, attractorData)),
    // Physics system
    dispatchUpdatePhysicsSettings: (uuid, physicsData) => dispatch(updatePhysicsSettings(uuid, physicsData)),
  }
}

export default connect(selectProps, mapDispatchToProps)(App)

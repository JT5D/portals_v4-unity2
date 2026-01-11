/**
 * Audio Item Render Component
 * 
 * Renders audio items in the AR scene with visual representation.
 * Supports ViroSound, ViroSoundField, and ViroSpatialSound.
 * 
 * Spatial audio is visualized as a bright green wireframe sphere
 * that users can position in the scene.
 */
'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import * as UIConstants from '../redux/UIConstants';
import { AUDIO_TYPES } from '../model/AudioItems';

import {
    ViroNode,
    ViroSphere,
    ViroSound,
    ViroSoundField,
    ViroSpatialSound,
    ViroMaterials,
} from '@reactvision/react-viro';

var createReactClass = require('create-react-class');

// Create the green wireframe material for audio visualization
ViroMaterials.createMaterials({
    audioVisualizerMaterial: {
        diffuseColor: '#00FF00',
        lightingModel: 'Constant',
        cullMode: 'None',
        writesToDepthBuffer: true,
        readsFromDepthBuffer: true,
    },
    audioVisualizerInnerMaterial: {
        diffuseColor: '#00AA00',
        lightingModel: 'Constant',
        opacity: 0.3,
    },
});

var AudioItemRender = createReactClass({
    propTypes: {
        audioIDProps: PropTypes.any,
        audioItem: PropTypes.any,
        onClickStateCallback: PropTypes.func,
        onTransformUpdate: PropTypes.func,
        onLoadCallback: PropTypes.func,
    },

    getInitialState() {
        const audioItem = this.props.audioItem || {};
        const isLoadedFromDraft = audioItem.isFromDraft === true;

        console.log('[AudioItemRender] getInitialState:', {
            uuid: audioItem.uuid,
            isLoadedFromDraft,
            type: audioItem.type,
            position: JSON.stringify(audioItem.position),
        });

        const finalPosition = isLoadedFromDraft && audioItem.position ? audioItem.position : [0, 0, -2];
        const finalRotation = isLoadedFromDraft && audioItem.rotation ? audioItem.rotation : [0, 0, 0];
        const finalScale = isLoadedFromDraft && audioItem.scale ? audioItem.scale : [1, 1, 1];

        return {
            position: finalPosition,
            rotation: finalRotation,
            scale: finalScale,
            nodeIsVisible: true,
        };
    },

    componentDidMount() {
        console.log('[AudioItemRender] componentDidMount:', this.props.audioItem?.uuid);
        this._isMounted = true;

        // Force re-render after 100ms for Viro batching workaround
        setTimeout(() => {
            if (this._isMounted) {
                this.forceUpdate();
            }
        }, 100);

        // Notify load complete
        if (this.props.onLoadCallback && this.props.audioItem) {
            this.props.onLoadCallback(this.props.audioItem.uuid, 'LOADED');
        }
    },

    componentWillUnmount() {
        this._isMounted = false;
    },

    _syncToRedux() {
        if (this.props.onTransformUpdate && this.props.audioItem) {
            this.props.onTransformUpdate(this.props.audioItem.uuid, {
                scale: this.state.scale,
                position: this.state.position,
                rotation: this.state.rotation,
            });
        }
    },

    _onDrag(dragToPos, source) {
        if (!dragToPos || !Array.isArray(dragToPos)) return;

        this.setState({ position: dragToPos });

        // Throttle Redux updates
        const now = Date.now();
        if (!this._lastDragSync || now - this._lastDragSync > 100) {
            this._lastDragSync = now;
            this._syncToRedux();
        }
    },

    _onRotate(rotateState, rotationFactor, source) {
        if (rotateState === 1 || this._initialRotationY === null || this._initialRotationY === undefined) {
            this._initialRotationY = this.state.rotation[1];
        }

        const newRotationY = (this._initialRotationY || 0) - rotationFactor;
        const newRotation = [this.state.rotation[0], newRotationY, this.state.rotation[2]];
        this.setState({ rotation: newRotation });

        const now = Date.now();
        if (!this._lastRotateSync || now - this._lastRotateSync > 100) {
            this._lastRotateSync = now;
            this._syncToRedux();
        }

        if (rotateState === 3) {
            this._initialRotationY = null;
            this._syncToRedux();
        }
    },

    _onPinch(pinchState, scaleFactor, source) {
        if (pinchState === 1 || !this._initialPinchScale) {
            this._initialPinchScale = this.state.scale;
        }

        const newScale = this._initialPinchScale.map((x) => x * scaleFactor);
        this.setState({ scale: newScale });

        const now = Date.now();
        if (!this._lastPinchSync || now - this._lastPinchSync > 100) {
            this._lastPinchSync = now;
            this._syncToRedux();
        }

        if (pinchState === 3) {
            this._initialPinchScale = null;
            this._syncToRedux();
        }
    },

    _onClickState(uuid) {
        return (clickState, position, source) => {
            if (clickState === 2 && this.props.onClickStateCallback) { // Click up
                this.props.onClickStateCallback(uuid, clickState, UIConstants.LIST_MODE_AUDIO);
            }
        };
    },

    _onError(event) {
        console.log('[AudioItemRender] Error:', event.nativeEvent ? event.nativeEvent.error : event);
    },

    _onFinish() {
        console.log('[AudioItemRender] Sound finished playing:', this.props.audioItem?.uuid);
    },

    // Render the appropriate audio component based on type
    _renderAudio() {
        const audioItem = this.props.audioItem;
        if (!audioItem || !audioItem.source) return null;

        const commonProps = {
            source: audioItem.source,
            volume: audioItem.volume !== undefined ? audioItem.volume : 1.0,
            loop: audioItem.loop !== undefined ? audioItem.loop : true,
            muted: audioItem.muted || false,
            paused: audioItem.paused || false,
            onError: this._onError,
            onFinish: this._onFinish,
        };

        switch (audioItem.type) {
            case AUDIO_TYPES.SOUND_FIELD:
                return (
                    <ViroSoundField
                        {...commonProps}
                        rotation={this.state.rotation}
                    />
                );

            case AUDIO_TYPES.SOUND:
                return (
                    <ViroSound {...commonProps} />
                );

            case AUDIO_TYPES.SPATIAL:
            default:
                return (
                    <ViroSpatialSound
                        {...commonProps}
                        position={[0, 0, 0]} // Relative to parent ViroNode
                        minDistance={audioItem.minDistance || 1}
                        maxDistance={audioItem.maxDistance || 10}
                        rolloffModel={audioItem.rolloffModel || 'Logarithmic'}
                    />
                );
        }
    },

    // Render visual representation for spatial audio
    _renderVisualizer() {
        const audioItem = this.props.audioItem;

        // Only show visualizer for spatial audio
        if (!audioItem || audioItem.type !== AUDIO_TYPES.SPATIAL) {
            return null;
        }

        // Return array of elements instead of JSX Fragment for createReactClass compatibility
        return [
            <ViroSphere
                key="outer-sphere"
                radius={0.12}
                facesOutward={true}
                materials={["audioVisualizerMaterial"]}
                widthSegmentCount={8}
                heightSegmentCount={6}
            />,
            <ViroSphere
                key="inner-sphere"
                radius={0.08}
                facesOutward={true}
                materials={["audioVisualizerInnerMaterial"]}
                widthSegmentCount={8}
                heightSegmentCount={6}
            />,
        ];
    },

    render() {
        const audioItem = this.props.audioItem;
        if (!audioItem) return null;

        console.log('[AudioItemRender] render called:', audioItem.uuid, 'source:', audioItem.source?.uri);

        const isSpatial = audioItem.type === AUDIO_TYPES.SPATIAL || audioItem.type === 'spatial';

        // For non-spatial audio, skip for now (could add background audio later)
        if (!isSpatial) {
            console.log('[AudioItemRender] Non-spatial audio type:', audioItem.type);
            return null;
        }

        // For audio, wrap in a positionable node for position tracking (for future use)
        // Using ViroSound instead of ViroSpatialSound due to crash with remote URLs
        return (
            <ViroNode
                key={audioItem.uuid}
                ref={(ref) => { this.arNodeRef = ref; }}
                position={this.state.position}
                visible={this.state.nodeIsVisible}
                onDrag={this._onDrag}
                dragType="FixedToWorld"
            >
                {/* Audio source - using ViroSound since ViroSpatialSound crashes with remote URLs */}
                <ViroSound
                    source={audioItem.source}
                    loop={true}
                    paused={this.props.paused || audioItem.paused || false}
                    volume={1.0}
                    onError={(event) => {
                        console.log('[AudioItemRender] ViroSound Error:',
                            event.nativeEvent ? event.nativeEvent.error : event);
                    }}
                />
            </ViroNode>
        );
    },
});

module.exports = AudioItemRender;

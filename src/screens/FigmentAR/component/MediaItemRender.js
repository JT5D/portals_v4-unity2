/**
 * Copyright (c) 2017-present, Viro Media, Inc.
 * All rights reserved.
 */
'use strict';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as UIConstants from '../redux/UIConstants';
import {
    ViroNode,
    ViroImage,
    ViroVideo,
} from '@reactvision/react-viro';

var createReactClass = require('create-react-class');

var MediaItemRender = createReactClass({
    propTypes: {
        mediaIDProps: PropTypes.any,
        mediaItem: PropTypes.any,
        onClickStateCallback: PropTypes.func,
        onTransformUpdate: PropTypes.func, // Callback to sync transforms back to Redux
    },

    // Click state handler - returns a function that captures the uuid
    _onClickState(uuid) {
        return (clickState, position, source) => {
            console.log('[MediaItemRender] _onClickState:', {
                uuid,
                clickState,
                position,
                source,
            });

            // clickState 1 = down, 2 = up, 3 = clicked
            // Only trigger selection on click-up (state 2) or click (state 3)
            if ((clickState === 2 || clickState === 3) && this.props.onClickStateCallback) {
                console.log('[MediaItemRender] Calling onClickStateCallback with uuid:', uuid);
                this.props.onClickStateCallback(uuid, clickState, UIConstants.LIST_MODE_MODEL);
            }
        };
    },

    getInitialState() {
        // Use saved values from mediaItem if loading from draft
        const mediaItem = this.props.mediaItem || {};
        // Use explicit isFromDraft flag (set by LOAD_SCENE reducer)
        const isLoadedFromDraft = mediaItem.isFromDraft === true;

        // Detailed debug logging with actual values
        console.log('[MediaItemRender] getInitialState DETAILED:', {
            uuid: mediaItem.uuid,
            isLoadedFromDraft,
            propsPosition: JSON.stringify(mediaItem.position),
            propsRotation: JSON.stringify(mediaItem.rotation),
            propsScale: JSON.stringify(mediaItem.scale),
        });

        const finalPosition = isLoadedFromDraft && mediaItem.position ? mediaItem.position : [0, 0, -1];
        const finalRotation = isLoadedFromDraft && mediaItem.rotation ? mediaItem.rotation : [0, 0, 0];
        const finalScale = isLoadedFromDraft && mediaItem.scale ? mediaItem.scale : [1, 1, 1];

        console.log('[MediaItemRender] Using position:', JSON.stringify(finalPosition));

        return {
            scale: finalScale,
            rotation: finalRotation,
            position: finalPosition,
            nodeIsVisible: true,
        }
    },

    componentDidMount() {
        console.log('[MediaItemRender] componentDidMount:', this.props.mediaItem.uuid);
        this._isMounted = true;

        // CRITICAL: Force re-render after 100ms to fix Viro batching visibility issue
        setTimeout(() => {
            if (this._isMounted) {
                this.forceUpdate();
            }
        }, 100);
    },

    componentDidUpdate(prevProps) {
        // CRITICAL: Handle case where LOAD_SCENE updates Redux AFTER component mounts
        // When isFromDraft changes from false/undefined to true, update state with saved transforms
        const wasFromDraft = prevProps.mediaItem?.isFromDraft === true;
        const isNowFromDraft = this.props.mediaItem?.isFromDraft === true;

        if (!wasFromDraft && isNowFromDraft) {
            const newPosition = this.props.mediaItem.position || this.state.position;
            const newRotation = this.props.mediaItem.rotation || this.state.rotation;
            const newScale = this.props.mediaItem.scale || this.state.scale;

            console.log('[MediaItemRender] isFromDraft changed to true, updating transforms:', {
                uuid: this.props.mediaItem.uuid,
                position: JSON.stringify(newPosition),
                rotation: JSON.stringify(newRotation),
                scale: JSON.stringify(newScale),
            });

            // Update React state with saved transforms from the draft
            this.setState({
                position: newPosition,
                rotation: newRotation,
                scale: newScale,
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
    },

    componentWillUnmount() {
        this._isMounted = false;
    },

    _syncToRedux() {
        // Sync transforms back to Redux for serialization
        if (this.props.onTransformUpdate && this.props.mediaItem) {
            console.log('[MediaItemRender] _syncToRedux called:', {
                uuid: this.props.mediaItem.uuid,
                position: JSON.stringify(this.state.position),
                rotation: JSON.stringify(this.state.rotation),
                scale: JSON.stringify(this.state.scale),
            });
            this.props.onTransformUpdate(this.props.mediaItem.uuid, {
                scale: this.state.scale,
                position: this.state.position,
                rotation: this.state.rotation,
            });
        }
    },

    _onPinch(pinchState, scaleFactor, source) {
        // Capture initial scale on first event
        if (pinchState === 1 || !this._initialPinchScale) {
            this._initialPinchScale = this.state.scale;
        }

        const newScale = this._initialPinchScale.map((x) => x * scaleFactor);
        this.setState({ scale: newScale });

        // Throttle Redux updates
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

    _onRotate(rotateState, rotationFactor, source) {
        // Capture initial rotation on first event
        if (rotateState === 1 || this._initialRotationY === null || this._initialRotationY === undefined) {
            this._initialRotationY = this.state.rotation[1];
        }

        const newRotationY = (this._initialRotationY || 0) - rotationFactor;
        const newRotation = [this.state.rotation[0], newRotationY, this.state.rotation[2]];
        this.setState({ rotation: newRotation });

        // Throttle Redux updates
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

    _onDrag(dragToPos, source) {
        // ViroReact onDrag provides (dragToPos, source) - not (state, position, source)
        if (!dragToPos || !Array.isArray(dragToPos)) return;

        this.setState({ position: dragToPos });

        // Throttle Redux updates
        const now = Date.now();
        if (!this._lastDragSync || now - this._lastDragSync > 100) {
            this._lastDragSync = now;
            this._syncToRedux();
        }
    },

    _onLoadStart() {
        console.log('[MediaItemRender] _onLoadStart');
    },

    _onLoadEnd() {
        console.log('[MediaItemRender] _onLoadEnd');
    },

    _onError(event) {
        console.log('[MediaItemRender] _onError:', event.nativeEvent ? event.nativeEvent.error : event);
    },

    render: function () {
        const mediaItem = this.props.mediaItem;
        if (!mediaItem) return null;

        console.log('[MediaItemRender] Rendering item with source:', mediaItem.source);

        return (
            <ViroNode
                ref={(component) => { this.arNodeRef = component; }}
                key={mediaItem.uuid}
                position={this.state.position}
                rotation={this.state.rotation}
                scale={this.state.scale}
                onDrag={this._onDrag}
                onPinch={this._onPinch}
                onRotate={this._onRotate}
                onClickState={this._onClickState(mediaItem.uuid)}
                dragType="FixedToWorld">

                {mediaItem.type === 'VIDEO' ? (
                    <ViroVideo
                        source={mediaItem.source}
                        loop={true}
                        placeholderSource={require("../../../../assets/icon.png")}
                        width={mediaItem.width || 1}
                        height={mediaItem.height || 1}
                        onClick={this.props.onClick}
                        onLoadStart={this._onLoadStart}
                        onLoadEnd={this._onLoadEnd}
                        onError={this._onError}
                    />
                ) : (
                    <ViroImage
                        source={mediaItem.source}
                        width={mediaItem.width || 1}
                        height={mediaItem.height || 1}
                        onClick={this.props.onClick}
                        onLoadStart={this._onLoadStart}
                        onLoadEnd={this._onLoadEnd}
                        onError={this._onError}
                    />
                )}
            </ViroNode>
        );
    },
});

module.exports = MediaItemRender;

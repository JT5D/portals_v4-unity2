import * as flatbuffers from 'flatbuffers';
import { PeerNetworking } from './engine_networking_peer.js';
import { type IModel, type INetworkConnection, SendQueue } from './engine_networking_types.js';
import { Context } from './engine_setup.js';
export declare const debugNet: boolean;
export declare const debugOwner: boolean;
export interface INetworkingWebsocketUrlProvider {
    getWebsocketUrl(): string | null;
}
export declare interface IConnectionData {
    id: string;
}
/** Events regarding the websocket connection (e.g. when the connection opens) */
export declare enum ConnectionEvents {
    ConnectionInfo = "connection-start-info"
}
/** Use to listen to room networking events like joining a networked room
 *  For example: `this.context.connection.beginListen(RoomEvents.JoinedRoom, () => { })`
 * @link https://engine.needle.tools/docs/networking.html#manual-networking
 * */
export declare enum RoomEvents {
    /** Internal: Sent to the server when attempting to join a room */
    Join = "join-room",
    /** Internal: Sent to the server when attempting to leave a room */
    Leave = "leave-room",
    /** Incoming: When the local user has joined a room */
    JoinedRoom = "joined-room",
    /** Incoming: When the local user has left a room */
    LeftRoom = "left-room",
    /** Incoming: When a other user has joined the room */
    UserJoinedRoom = "user-joined-room",
    /** Incoming: When a other user has left the room */
    UserLeftRoom = "user-left-room",
    /** When a user joins a room, the server sends the entire room state. Afterwards, the server sends the room-state-sent event. */
    RoomStateSent = "room-state-sent"
}
/**
 * See {@link RoomEvents} for all event names and docs.
 * - `joined-room`: When the local user has joined a room
 * - `left-room`: When the local user has left a room
 * - `user-joined-room`: When a other user has joined the room
 * - `user-left-room`: When a other user has left the room
 * - `room-state-sent`: When the server has sent the room state to the client
 */
type RoomEventsIncoming = Exclude<`${RoomEvents}`, "join-room" | "leave-room">;
/** Received when listening to `RoomEvents.JoinedRoom` event */
export declare class JoinedRoomResponse {
    room: string;
    viewId: string;
    allowEditing: boolean;
    inRoom: string[];
}
export declare class LeftRoomResponse {
    room: string;
}
export declare class UserJoinedOrLeftRoomModel {
    userId: string;
}
/** The Needle Engine networking server supports the concept of ownership that can be requested.
 * This enum contains possible outgoing (Request*) and incoming (Response*) events for communicating ownership.
 *
 * Typically, using the {@link OwnershipModel} class instead of dealing with those events directly is preferred. */
export declare enum OwnershipEvent {
    RequestHasOwner = "request-has-owner",
    ResponseHasOwner = "response-has-owner",
    RequestIsOwner = "request-is-owner",
    ResponseIsOwner = "response-is-owner",
    RequestOwnership = "request-ownership",
    GainedOwnership = "gained-ownership",
    RemoveOwnership = "remove-ownership",
    LostOwnership = "lost-ownership",
    GainedOwnershipBroadcast = "gained-ownership-broadcast",
    LostOwnershipBroadcast = "lost-ownership-broadcast"
}
type OwnershipEventNamesIncoming = Exclude<`${OwnershipEvent}`, "request-has-owner" | "request-is-owner" | "request-ownership" | "remove-ownership">;
declare type WebsocketSendType = IModel | object | boolean | null | string | number;
/** Class for abstracting the concept of ownership regarding a networked object or component.
 * A component that is owned by another user can not be modified through networking (the server will reject changes) */
export declare class OwnershipModel {
    guid: string;
    private connection;
    get hasOwnership(): boolean;
    /** @returns true of anyone has ownership */
    get isOwned(): boolean | undefined;
    /**
     * Checks if Needle Engine networking is connected to a websocket. Note that this is **not equal** to being connected to a *room*. If you want to check if Needle Engine is connected to a networking room use the `isInRoom` property.
     * @returns true if connected to the websocket.
     */
    get isConnected(): boolean;
    private _hasOwnership;
    private _isOwned;
    private _gainSubscription;
    private _lostSubscription;
    private _hasOwnerResponse;
    constructor(connection: NetworkConnection, guid: string);
    private _isWaitingForOwnershipResponseCallback;
    updateIsOwned(): void;
    private onHasOwnerResponse;
    requestOwnershipIfNotOwned(): OwnershipModel;
    private waitForHasOwnershipRequestResponse;
    requestOwnershipAsync(): Promise<OwnershipModel>;
    requestOwnership(): OwnershipModel;
    freeOwnership(): OwnershipModel;
    destroy(): void;
    private onGainedOwnership;
    private onLostOwnership;
}
export declare type BinaryCallback = {
    (data: any | flatbuffers.ByteBuffer): void;
};
/** Main class to communicate with the networking backend
 * @link https://engine.needle.tools/docs/networking.html
 *
*/
export declare class NetworkConnection implements INetworkConnection {
    private context;
    private _peer;
    constructor(context: Context);
    /** Experimental: networking via peerjs */
    get peer(): PeerNetworking;
    /**
     * Returns the state of a given guid.
     */
    tryGetState(guid: string): IModel | null;
    /** The connection id of the local user - it is given by the networking backend and can not be changed */
    get connectionId(): string | null;
    /** Returns true if the networking backend is in debug mode.
     * To see all networking messages in the console use `?debugnet` in the url
     */
    get isDebugEnabled(): boolean;
    /**
     * Checks if Needle Engine networking is connected to a websocket. Note that this is **not equal** to being connected to a *room*. If you want to check if Needle Engine is connected to a networking room use the `isInRoom` property.
     * @returns true if connected to the websocket.
     */
    get isConnected(): boolean;
    /** The name of the room the user is currently connected to */
    get currentRoomName(): string | null;
    /** True when connected to a room via a regular url, otherwise (when using a view only url) false indicating that the user should not be able to modify the scene */
    get allowEditing(): boolean;
    /**
     * The view id of the room the user is currently connected to.
     */
    get currentRoomViewId(): string | null;
    /**
     * Returns a url that can be shared with others to view the current room in view only mode.
     * This is useful for sharing a room with others without allowing them to modify the scene.
     * Use `connection.allowEditing` to check if the current room is in view only mode.
     */
    getViewOnlyUrl(): string | null;
    /** True if connected to a networked room. Use the joinRoom function or a `SyncedRoom` component */
    get isInRoom(): boolean;
    /** Latency to currently connected backend server */
    get currentLatency(): number;
    /**
     * The current server url that the networking backend is connected to (e.g. the url of the websocket server)
     */
    get currentServerUrl(): string | null;
    /** A ping is sent to the server at a regular interval while the browser tab is active. This method can be used to send additional ping messages when needed so that the user doesn't get disconnected from the networking backend */
    sendPing(): void;
    /** Returns true if a user with the given connectionId is in the room */
    userIsInRoom(id: string): boolean;
    private _usersInRoomCopy;
    /** Returns a list of all user ids in the current room */
    usersInRoom(target?: string[] | null): string[];
    /** Joins a networked room. If you don't want to manage a connection yourself you can use a `SyncedRoom` component as well */
    joinRoom(room: string, viewOnly?: boolean): boolean;
    /** Use to leave a room that you are currently connected to (use `leaveRoom()` to disconnect from the currently active room but you can also specify a room name) */
    leaveRoom(room?: string | null): boolean;
    /** Send a message to the networking backend - it will broadcasted to all connected users in the same room by default */
    send<T extends WebsocketSendType>(key: string | OwnershipEvent, data?: T | null, queue?: SendQueue): void;
    /** Use to delete state for a given guid on the server */
    sendDeleteRemoteState(guid: string): void;
    /** Use to delete all state in the currently connected room on the server */
    sendDeleteRemoteStateAll(): void;
    /** Send a binary message to the server (broadcasted to all connected users) */
    sendBinary(bin: Uint8Array): void;
    private _defaultMessagesBuffer;
    private _defaultMessagesBufferArray;
    sendBufferedMessagesNow(): void;
    /** Use to start listening to networking events.
     * To unsubscribe from events use the `stopListen` method.
     * See the example below for typical usage:
     *
     * ### Component Example
     * ```ts
     * // Make sure to unsubscribe from events when the component is disabled
     * export class MyComponent extends Behaviour {
     *   onEnable() {
     *     this.connection.beginListen("joined-room", this.onJoinedRoom)
     *   }
     *   onDisable() {
     *     this.connection.stopListen("joined-room", this.onJoinedRoom)
     *   }
     *   onJoinedRoom = () => {
     *      console.log("I joined a networked room")
     *   }
     * }
     * ```
     * @link https://engine.needle.tools/docs/networking.html
     *
    */
    beginListen(key: (string & {}) | OwnershipEvent | OwnershipEventNamesIncoming | RoomEventsIncoming | RoomEvents, callback: Function): Function;
    /**@deprecated please use stopListen instead (2.65.2-pre) */
    stopListening(key: (string & {}) | OwnershipEvent | OwnershipEventNamesIncoming | RoomEventsIncoming | RoomEvents, callback: Function | null): void;
    /** Use to stop listening to networking events
     * To subscribe to events use the `beginListen` method.
     * See the example below for typical usage:
     *
     * ### Component Example
     * ```ts
     * // Make sure to unsubscribe from events when the component is disabled
     * export class MyComponent extends Behaviour {
     *   onEnable() {
     *     this.connection.beginListen("joined-room", this.onJoinedRoom)
     *   }
     *   onDisable() {
     *     this.connection.stopListen("joined-room", this.onJoinedRoom)
     *   }
     *   onJoinedRoom = () => {
     *      console.log("I joined a networked room")
     *   }
     * }
     * ```
     */
    stopListen(key: (string & {}) | OwnershipEvent | OwnershipEventNamesIncoming | RoomEventsIncoming | RoomEvents, callback: Function | null): void;
    /** Use to start listening to networking binary events */
    beginListenBinary(identifier: string, callback: BinaryCallback): BinaryCallback;
    /** Use to stop listening to networking binary events */
    stopListenBinary(identifier: string, callback: any): void;
    private netWebSocketUrlProvider?;
    /** Use to override the networking server backend url. This is what the `Networking` component uses to modify the backend url */
    registerProvider(prov: INetworkingWebsocketUrlProvider): void;
    /** Used to connect to the networking server */
    connect(url?: string): Promise<boolean>;
    /** Disconnect from the networking backend + reset internal state */
    disconnect(): void;
    private _listeners;
    private _listenersBinary;
    private connected;
    private channelId;
    private _connectionId;
    private _ws;
    private _waitingForSocket;
    private _isInRoom;
    private _currentRoomName;
    private _currentRoomViewId;
    private _currentRoomAllowEditing;
    private _currentInRoom;
    private _state;
    private _currentDelay;
    private _connectingToWebsocketPromise;
    private connectWebsocket;
    private onMessage;
    private handleIncomingBinaryMessage;
    private handleIncomingStringMessage;
    private toMessage;
    private sendWithWebsocket;
    private onSendQueued;
}
export {};

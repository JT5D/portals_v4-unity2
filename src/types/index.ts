export interface User {
    id: string;
    username: string;
    email?: string;
    name?: string;
    avatar: string;
    isVerified?: boolean;
    bio?: string;
    followers: number;
    following: number;
    friends: number; // For "Friends" count specifically if different from following
    flames: number; // Total likes received
    fuelBalance?: number; // Earned fuel from walking/rewards (spendable)
    isPrivate?: boolean;
    worldSceneId?: string; // Reference to user's world scene
    worldBackground?: string; // Cover image URL for profile background
    fuelStats?: {
        totalEarned: number;
        totalWalkedKm: number; // For "Explorer" badge logic
        dailyEarned: number;
        lastDailyReset: string; // ISO date
    };
    notificationPreferences?: NotificationPreferences;
    messagingPermission?: 'Everyone' | 'Following' | 'Off';
    usage?: UsageStats;
}

export interface UsageStats {
    scenes: {
        used: number;
        limit: number;
        resetDate: string; // ISO date
    };
    locations: {
        used: number;
        limit: number;
        resetDate: string; // ISO date
    };
    paidScenes?: number;
    paidLocations?: number;
}

export type NotifyOption = 'Everyone' | 'Following' | 'Off';

export interface NotificationPreferences {
    likes: NotifyOption;
    comments: NotifyOption;
    mentions: NotifyOption;
    remixes: NotifyOption;
    follows: NotifyOption;
}

export interface Artifact {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
}

export interface Post {
    id: string;
    userId: string;
    user: User;
    caption: string;
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    date: string;
    tags: string[];
    taggedUsers?: string[]; // IDs of tagged users
    locations?: {
        name?: string;
        latitude: number;
        longitude: number;
        altitude?: number; // Meters above WGS84 ellipsoid for geospatial anchors
        accuracy?: number; // Horizontal accuracy in meters
    }[];
    discoveryRadius?: number; // Meters. If set, content is "hidden" until close.
    fuelReward?: number; // XP for discovering this post
    category: string; // Feed Channel
    music?: string;
    mediaUri?: string; // Video or Image URI
    coverImage?: string; // Thumbnail/Poster
    sceneData?: any; // Serialized Scene Data
    sceneId?: string; // ID if already saved
    linkedArtifact?: Artifact;
    isArtifact?: boolean;
    remixedFrom?: {
        postId: string;
        userId: string;
        username: string;
        avatar: string;
    };
}

export interface Comment {
    id: string;
    userId: string;
    user: User;
    text: string;
    timestamp: string;
    likes: number;
    isLiked: boolean;
    replies?: Comment[];
}

export interface Notification {
    id: string;
    type: 'like_post' | 'like_comment' | 'follow' | 'comment' | 'mention' | 'collab_invite' | 'message' | 'system';
    user: User;
    message: string;
    timestamp: string;
    read: boolean;
    data?: {
        postId?: string;
        commentId?: string;
        previewMedia?: string; // URL for thumbnail
    };
    actionStatus?: 'pending' | 'accepted' | 'declined'; // For invites
}

export interface Draft {
    id: string;
    title: string;
    date: string;
    coverImage?: string;
    sceneData?: any;
    sceneId?: string;
    updatedAt?: string;
    createdAt?: string;
    collaborators?: string[]; // List of User IDs
    ownerId?: string; // Original creator ID
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    timestamp: number;
    read: boolean;
    deleted: boolean; // Soft delete for moderation
}

export interface Conversation {
    id: string;
    participantIds: string[];
    lastMessage: string;
    lastMessageTime: number;
    createdAt: number;
}


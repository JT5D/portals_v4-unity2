/**
 * Social Store Slice
 * Handles relationships, following, team, and collaboration
 */
import { create } from 'zustand';
import { User } from '../../types';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { NotificationService } from '../../services/notifications';

export interface Relationships {
    team: string[];
    invites: string[];
    friends: string[];
    following: string[];
    blocked: string[];
}

export interface SocialSlice {
    relationships: Relationships;
    followingUsers: User[];

    sendInvite: (userId: string) => void;
    approveInvite: (userId: string) => void;
    rejectInvite: (userId: string) => void;
    removeTeamMember: (userId: string) => void;
    followUser: (userId: string) => void;
    unfollowUser: (userId: string) => void;
    fetchFollowing: (currentUserId: string) => Promise<void>;
    fetchFollowingUsers: (currentUserId: string, currentFollowing: string[]) => Promise<void>;

    // Collaboration
    sendCollaborationInvite: (currentUser: User, draftId: string, targetUserId: string, draftTitle?: string) => Promise<void>;
    respondToCollabInvite: (currentUser: User, notificationId: string, draftId: string, inviterId: string, draftTitle: string, accepted: boolean) => Promise<void>;
}

export const createSocialSlice = (set: any, get: any): SocialSlice => ({
    relationships: {
        team: [],
        invites: ['u2', 'u3', 'u4'],
        friends: ['u3'],
        following: ['u3', 'u4'],
        blocked: []
    },
    followingUsers: [],

    sendInvite: (userId) => set((state: any) => ({
        relationships: {
            ...state.relationships,
            invites: [...state.relationships.invites, userId]
        }
    })),

    approveInvite: (userId) => set((state: any) => ({
        relationships: {
            ...state.relationships,
            invites: state.relationships.invites.filter((id: string) => id !== userId),
            team: [...state.relationships.team, userId]
        }
    })),

    rejectInvite: (userId) => set((state: any) => ({
        relationships: {
            ...state.relationships,
            invites: state.relationships.invites.filter((id: string) => id !== userId),
            blocked: [...state.relationships.blocked, userId]
        }
    })),

    removeTeamMember: (userId) => set((state: any) => ({
        relationships: {
            ...state.relationships,
            team: state.relationships.team.filter((id: string) => id !== userId)
        }
    })),

    followUser: (userId) => set((state: any) => ({
        relationships: {
            ...state.relationships,
            following: [...state.relationships.following, userId]
        }
    })),

    unfollowUser: (userId) => set((state: any) => ({
        relationships: {
            ...state.relationships,
            following: state.relationships.following.filter((id: string) => id !== userId)
        }
    })),

    fetchFollowing: async (currentUserId: string) => {
        try {
            const followingRef = collection(db, 'users', currentUserId, 'following');
            const snapshot = await getDocs(followingRef);
            const followingIds = snapshot.docs.map(doc => doc.id);

            set((state: any) => ({
                relationships: {
                    ...state.relationships,
                    following: followingIds
                }
            }));
            console.log(`[SocialSlice] Fetched ${followingIds.length} following users.`);
        } catch (e) {
            console.error('[SocialSlice] Error fetching following list:', e);
        }
    },

    fetchFollowingUsers: async (currentUserId: string, currentFollowing: string[]) => {
        try {
            let followingIds = currentFollowing;
            if (followingIds.length === 0) {
                await get().fetchFollowing(currentUserId);
                followingIds = get().relationships.following;
            }

            if (followingIds.length === 0) {
                set({ followingUsers: [] });
                return;
            }

            const users: User[] = [];
            for (const userId of followingIds) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        users.push({
                            id: userDoc.id,
                            username: data.username || 'Unknown',
                            displayName: data.displayName || data.username || 'Unknown',
                            avatar: data.avatar || 'https://i.pravatar.cc/150',
                            bio: data.bio || '',
                            followers: data.followers || 0,
                            following: data.following || 0,
                            friends: data.friends || 0,
                            flames: data.flames || 0,
                            isVerified: data.isVerified || false,
                        } as User);
                    }
                } catch (e) {
                    console.warn(`[SocialSlice] Failed to fetch user ${userId}:`, e);
                }
            }

            set({ followingUsers: users });
            console.log(`[SocialSlice] Fetched ${users.length} following user details.`);
        } catch (e) {
            console.error('[SocialSlice] Error fetching following users:', e);
        }
    },

    sendCollaborationInvite: async (currentUser, draftId, targetUserId, draftTitle = 'Untitled Scene') => {
        try {
            console.log(`[SocialSlice] Sending invite for draft ${draftId} to ${targetUserId}`);
            await NotificationService.sendCollabInviteNotification(
                currentUser,
                targetUserId,
                draftId,
                draftTitle
            );
            console.log(`[SocialSlice] Collaboration invite sent to ${targetUserId}`);
        } catch (e) {
            console.error('[SocialSlice] Error sending invite:', e);
        }
    },

    respondToCollabInvite: async (currentUser, notificationId, draftId, inviterId, draftTitle, accepted) => {
        try {
            console.log(`[SocialSlice] Responding to collab invite: ${accepted ? 'ACCEPT' : 'DECLINE'}`);

            if (accepted && draftId) {
                // Try scenes collection first
                const sceneRef = doc(db, 'scenes', draftId);
                const sceneSnap = await getDoc(sceneRef);

                if (sceneSnap.exists()) {
                    await updateDoc(sceneRef, {
                        collaborators: arrayUnion(currentUser.id)
                    });
                } else {
                    const draftRef = doc(db, 'drafts', draftId);
                    const draftSnap = await getDoc(draftRef);
                    if (draftSnap.exists()) {
                        await updateDoc(draftRef, {
                            collaborators: arrayUnion(currentUser.id)
                        });
                    }
                }

                // Add inviter to team
                set((state: any) => ({
                    relationships: {
                        ...state.relationships,
                        team: [...new Set([...state.relationships.team, inviterId])]
                    }
                }));
            }

            await NotificationService.sendCollabResponseNotification(
                currentUser,
                inviterId,
                accepted,
                draftTitle || 'a scene'
            );

            await NotificationService.markAsRead(currentUser.id, notificationId);
            console.log(`[SocialSlice] Collab response sent`);
        } catch (e) {
            console.error('[SocialSlice] Error responding to collab invite:', e);
        }
    },
});

// Standalone store for components that only need social features
export const useSocialStore = create<SocialSlice>((set, get) => createSocialSlice(set, get));

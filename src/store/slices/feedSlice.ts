/**
 * Feed Store Slice
 * Handles posts, likes, comments with pagination support
 */
import { create } from 'zustand';
import { Post, Comment, User } from '../../types';
import { POSTS, COMMENTS } from '../../mock';
import { db } from '../../config/firebase';
import {
    collection, query, orderBy, getDocs, limit, deleteDoc, doc,
    startAfter, DocumentSnapshot
} from 'firebase/firestore';

export interface FeedSlice {
    feed: Post[];
    comments: Record<string, Comment[]>;
    pendingComment: { postId: string; text: string } | null;
    feedCursor: DocumentSnapshot | null;
    hasMorePosts: boolean;
    isLoadingFeed: boolean;

    toggleLike: (postId: string, currentUser: User) => Promise<void>;
    addPost: (post: Post) => void;
    fetchFeed: (currentUser: User | null, cursor?: DocumentSnapshot) => Promise<void>;
    fetchMorePosts: (currentUser: User | null) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    addComment: (postId: string, text: string, currentUser: User) => Promise<void>;
    addReply: (postId: string, parentCommentId: string, reply: Comment) => void;
    setPendingComment: (pending: { postId: string; text: string } | null) => void;
}

const PAGE_SIZE = 20;

export const createFeedSlice = (set: any, get: any): FeedSlice => ({
    feed: POSTS,
    comments: { 'p1': COMMENTS },
    pendingComment: null,
    feedCursor: null,
    hasMorePosts: true,
    isLoadingFeed: false,

    toggleLike: async (postId, currentUser) => {
        const state = get();
        const post = state.feed.find((p: Post) => p.id === postId);
        if (!post || !currentUser) return;

        const isLiked = post.isLiked;

        // Optimistic Update
        set((s: any) => ({
            feed: s.feed.map((p: Post) =>
                p.id === postId
                    ? { ...p, isLiked: !isLiked, likes: isLiked ? p.likes - 1 : p.likes + 1 }
                    : p
            )
        }));

        try {
            const { FeedService } = await import('../../services/feed');
            await FeedService.toggleLike(postId, currentUser.id, isLiked);

            if (!isLiked && post.userId !== currentUser.id) {
                const { NotificationService } = await import('../../services/notifications');
                await NotificationService.sendLikeNotification(currentUser, post);
            }
        } catch (error) {
            console.error('[FeedSlice] Error toggling like:', error);
            // Revert on failure
            set((s: any) => ({
                feed: s.feed.map((p: Post) =>
                    p.id === postId
                        ? { ...p, isLiked: isLiked, likes: isLiked ? p.likes : p.likes - 1 }
                        : p
                )
            }));
        }
    },

    addPost: (post) => set((state: any) => ({
        feed: [post, ...state.feed]
    })),

    fetchFeed: async (currentUser, cursor) => {
        try {
            set({ isLoadingFeed: true });
            console.log('[FeedSlice] Fetching feed...');

            let queryConstraints = [
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            ];

            if (cursor) {
                queryConstraints.push(startAfter(cursor) as any);
            }

            let querySnapshot;
            try {
                const q = query(collection(db, 'posts'), ...queryConstraints);
                querySnapshot = await getDocs(q);
            } catch (err: any) {
                console.warn('[FeedSlice] Sorted query failed, falling back to unsorted.', err.message);
                const fallbackQ = query(collection(db, 'posts'), limit(PAGE_SIZE));
                querySnapshot = await getDocs(fallbackQ);
            }

            const posts: Post[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                posts.push({
                    id: doc.id,
                    userId: data.userId,
                    user: data.user,
                    caption: data.caption,
                    likes: data.likes || 0,
                    comments: data.comments || 0,
                    shares: data.shares || 0,
                    isLiked: false,
                    date: data.date,
                    tags: data.tags || [],
                    taggedUsers: data.taggedUsers || [],
                    locations: data.locations || [],
                    category: data.category || 'Feed',
                    music: data.music || 'Original Sound',
                    mediaUri: data.mediaUri,
                    coverImage: data.coverImage,
                    sceneId: data.sceneId,
                    sceneData: data.sceneData,
                    isArtifact: data.isArtifact || false,
                    portalSettings: data.portalSettings || null, // Portal gamification settings
                } as Post);
            });

            // Check like status
            if (currentUser && posts.length > 0) {
                const { FeedService } = await import('../../services/feed');
                await Promise.all(
                    posts.map(async (post) => {
                        post.isLiked = await FeedService.checkIsLiked(post.id, currentUser.id);
                    })
                );
            }

            // Filter out mystery portals, posts with rarity tiers, and posts with signal modes
            // These are map-only experiences and should not appear in the regular feed
            const filteredPosts = posts.filter((post) => {
                const settings = post.portalSettings;
                if (!settings) return true; // No portal settings = regular post, show in feed

                // Exclude mystery posts
                if (settings.isMystery === true) {
                    console.log(`[FeedSlice] Filtering out mystery post: ${post.id}`);
                    return false;
                }

                // Exclude posts with rarity tiers (these are map portals)
                if (settings.rarity) {
                    console.log(`[FeedSlice] Filtering out portal with rarity: ${post.id} (${settings.rarity})`);
                    return false;
                }

                // Exclude posts with signal modes (these are map portals)
                if (settings.signalMode) {
                    console.log(`[FeedSlice] Filtering out portal with signal mode: ${post.id} (${settings.signalMode})`);
                    return false;
                }

                return true; // Show in feed
            });

            console.log(`[FeedSlice] Filtered ${posts.length - filteredPosts.length} portal posts from feed`);

            const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
            const hasMore = querySnapshot.docs.length === PAGE_SIZE;

            console.log(`[FeedSlice] Fetched ${filteredPosts.length} posts (${posts.length} total, ${posts.length - filteredPosts.length} filtered). Has more: ${hasMore}`);

            if (cursor) {
                // Append to existing feed
                set((s: any) => ({
                    feed: [...s.feed, ...filteredPosts],
                    feedCursor: lastDoc,
                    hasMorePosts: hasMore,
                    isLoadingFeed: false
                }));
            } else {
                // Replace feed
                set({
                    feed: filteredPosts.length > 0 ? filteredPosts : get().feed,
                    feedCursor: lastDoc,
                    hasMorePosts: hasMore,
                    isLoadingFeed: false
                });
            }
        } catch (e) {
            console.error('[FeedSlice] Error fetching feed:', e);
            set({ isLoadingFeed: false });
        }
    },

    fetchMorePosts: async (currentUser) => {
        const state = get();
        if (!state.hasMorePosts || state.isLoadingFeed) return;
        await get().fetchFeed(currentUser, state.feedCursor);
    },

    deletePost: async (postId) => {
        try {
            console.log(`[FeedSlice] Deleting post ${postId}...`);
            await deleteDoc(doc(db, 'posts', postId));
            set((state: any) => ({
                feed: state.feed.filter((p: Post) => p.id !== postId)
            }));
            console.log(`[FeedSlice] Deleted post ${postId}`);
        } catch (e) {
            console.error('[FeedSlice] Error deleting post:', e);
        }
    },

    addComment: async (postId, text, currentUser) => {
        console.log(`[FeedSlice] Adding comment to ${postId}`);

        // Optimistic update
        set((s: any) => ({
            feed: s.feed.map((p: Post) =>
                p.id === postId ? { ...p, comments: p.comments + 1 } : p
            )
        }));

        try {
            const { FeedService } = await import('../../services/feed');
            await FeedService.addComment(
                postId,
                currentUser.id,
                text,
                currentUser.avatar || '',
                currentUser.username
            );
        } catch (error) {
            console.error('[FeedSlice] Error adding comment:', error);
            // Revert
            set((s: any) => ({
                feed: s.feed.map((p: Post) =>
                    p.id === postId ? { ...p, comments: p.comments - 1 } : p
                )
            }));
        }
    },

    addReply: (postId, parentCommentId, reply) => set((state: any) => {
        const postComments = state.comments[postId] || [];
        const updatedComments = postComments.map((c: Comment) => {
            if (c.id === parentCommentId) {
                return { ...c, replies: [...(c.replies || []), reply] };
            }
            return c;
        });

        return {
            comments: {
                ...state.comments,
                [postId]: updatedComments
            },
            feed: state.feed.map((p: Post) =>
                p.id === postId ? { ...p, comments: p.comments + 1 } : p
            )
        };
    }),

    setPendingComment: (pending) => set({ pendingComment: pending }),
});

// Standalone store for components that only need feed
export const useFeedStore = create<FeedSlice>((set, get) => createFeedSlice(set, get));

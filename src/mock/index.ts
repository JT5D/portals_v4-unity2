import { User, Post, Notification, Comment, Draft } from '../types';

export const CURRENT_USER: User = {
    id: 'u1',
    username: 'antigravity_dev',
    name: 'Antigravity Developer',
    avatar: 'https://i.pravatar.cc/150?u=antigravity_dev',
    bio: 'Building the future of social apps 🚀',
    followers: 4500,
    following: 124,
    friends: 120,
    flames: 3486,
};

export const USERS: User[] = [
    CURRENT_USER,
    {
        id: 'u2',
        username: 'gucci_official',
        name: 'Gucci',
        avatar: 'https://i.pravatar.cc/150?u=gucci',
        followers: 1000000,
        following: 500,
        friends: 50,
        flames: 9000,
    },
    {
        id: 'u3',
        username: 'skater_boi',
        name: 'Skate Pro',
        avatar: 'https://i.pravatar.cc/150?u=skater',
        followers: 1200,
        following: 300,
        friends: 300,
        flames: 200,
    },
    {
        id: 'u4',
        username: 'art_lover',
        name: 'Digital Artist',
        avatar: 'https://i.pravatar.cc/150?u=art',
        followers: 5000,
        following: 400,
        friends: 400,
        flames: 500,
    },
];

export const ARTIFACTS = [
    {
        id: 'a1',
        name: 'Gucci Virtual Hoodie',
        price: 500,
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
        description: 'Exclusive digital hoodie for your avatar.'
    },
    {
        id: 'a2',
        name: 'Skate Deck Skin',
        price: 150,
        image: 'https://images.unsplash.com/photo-1520022839932-520e791206d2?auto=format&fit=crop&w=600&q=80',
        description: 'Rare pattern for your board.'
    },
    {
        id: 'a3',
        name: 'Digital Art Frame',
        price: 800,
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb392796a5?auto=format&fit=crop&w=600&q=80',
        description: 'Display your NFTs in style.'
    },
    {
        id: 'a4',
        name: 'Portal Key',
        price: 1200,
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        description: 'Unlock secret rooms.'
    },
    {
        id: 'a5',
        name: 'Cyber Shades',
        price: 350,
        image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
        description: 'Augmented reality sunglasses.'
    },
    {
        id: 'a6',
        name: 'Neon Halo',
        price: 2000,
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
        description: 'Glowing halo accessory.'
    }
];

export const POSTS: Post[] = [
    {
        id: 'p1',
        userId: 'u2',
        user: USERS[1],
        caption: 'New collection dropping soon! 🔥 #fashion #gucci #style',
        likes: 12400,
        comments: 579,
        shares: 400,
        isLiked: false,
        date: '2-28',
        tags: ['fashion', 'gucci', 'style'],
        music: 'Gucci Gang - Lil Pump',
        linkedArtifact: ARTIFACTS[0],
        category: 'fashion'
    },
    {
        id: 'p2',
        userId: 'u3',
        user: USERS[2],
        caption: 'Kickflip practice at the park 🛹',
        likes: 850,
        comments: 42,
        shares: 15,
        isLiked: true,
        date: 'Yesterday',
        tags: ['skate', 'tricks'],
        music: 'Original Sound',
        linkedArtifact: ARTIFACTS[1],
        category: 'sports'
    },
    {
        id: 'p3',
        userId: 'u4',
        user: USERS[3],
        caption: 'Check out this digital art piece I made!',
        likes: 2300,
        comments: 120,
        shares: 89,
        isLiked: false,
        date: 'Just now',
        tags: ['art', 'digital'],
        music: 'Lo-Fi Chill',
        linkedArtifact: ARTIFACTS[2],
        category: 'art'
    },
    {
        id: 'p4',
        userId: 'u1',
        user: USERS[0],
        caption: 'Look what I found in the portal! 🗝️',
        likes: 150,
        comments: 12,
        shares: 5,
        isLiked: false,
        date: 'Just now',
        tags: ['adventure', 'secret'],
        music: 'Mystery Track',
        linkedArtifact: ARTIFACTS[3],
        category: 'adventure'
    },
    {
        id: 'p5',
        userId: 'u2',
        user: USERS[1],
        caption: 'Summer vibes 🕶️',
        likes: 5000,
        comments: 200,
        shares: 100,
        isLiked: false,
        date: '1h',
        tags: ['summer', 'vibes'],
        music: 'Sunroof',
        linkedArtifact: ARTIFACTS[4],
        category: 'lifestyle'
    },
    {
        id: 'p6',
        userId: 'u3',
        user: USERS[2],
        caption: 'Glow up ✨',
        likes: 8000,
        comments: 350,
        shares: 200,
        isLiked: true,
        date: '2h',
        tags: ['glow', 'neon'],
        music: 'Blinding Lights',
        linkedArtifact: ARTIFACTS[5],
        category: 'lifestyle'
    }
];

export const COMMENTS: Comment[] = [
    {
        id: 'c1',
        userId: 'u3',
        user: USERS[2],
        text: 'This is fire! 🔥',
        timestamp: '2h',
        likes: 45,
        isLiked: false,
        replies: [
            {
                id: 'c1-r1',
                userId: 'u1',
                user: CURRENT_USER,
                text: 'Agreed!',
                timestamp: '1h',
                likes: 2,
                isLiked: false,
            }
        ]
    },
    {
        id: 'c2',
        userId: 'u4',
        user: USERS[3],
        text: 'Love the vibe ❤️',
        timestamp: '3h',
        likes: 12,
        isLiked: true,
    }
];

export const NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'collab_invite',
        user: USERS[1], // @sarah_creator
        message: 'invited you to collaborate on "Neon Dreams"',
        timestamp: '2m ago',
        read: false,
        actionStatus: 'pending',
        data: { previewMedia: 'https://picsum.photos/id/10/200' }
    },
    {
        id: '2',
        type: 'like_post',
        user: USERS[2], // @mike_beats
        message: 'liked your video',
        timestamp: '15m ago',
        read: false,
        data: { postId: '1', previewMedia: 'https://picsum.photos/id/15/200' }
    },
    {
        id: '3',
        type: 'mention',
        user: USERS[3], // @jess_vfx
        message: 'mentioned you in a comment: "@ryan check this out!"',
        timestamp: '1h ago',
        read: true,
        data: { postId: '2', commentId: 'c1', previewMedia: 'https://picsum.photos/id/20/200' }
    },
    {
        id: '4',
        type: 'follow',
        user: USERS[0], // Assuming USERS[4] is not defined, using USERS[0] for CURRENT_USER
        message: 'started following you',
        timestamp: '3h ago',
        read: true,
    },
    {
        id: '5',
        type: 'message',
        user: USERS[1],
        message: 'sent you a message: "Hey, are you free to chat?"',
        timestamp: '5h ago',
        read: true,
    },
    {
        id: '6',
        type: 'system',
        user: { ...USERS[0], id: 'system', username: 'Portals', name: 'Portals Team', avatar: 'https://ui-avatars.com/api/?name=Portals&background=000&color=fff' },
        message: 'Welcome to Portals! Your journey begins now.',
        timestamp: '1d ago',
        read: true,
    }
];

export const DRAFTS: Draft[] = [
    {
        id: 'd1',
        title: 'Latest Draft',
        date: '2025-12-08',
    },
    {
        id: 'd2',
        title: 'Draft 2',
        date: '2025-12-05',
    },
];

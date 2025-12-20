// src/store/useCommunityStore.ts
import { create } from 'zustand';
import { FeedPost } from '../types/community';

// 初始 Mock 数据 (把之前的搬过来作为底料)
const INITIAL_POSTS: FeedPost[] = [
  {
    id: 'p1',
    user: { id: 'u1', username: 'Adam Ondra', avatar: 'https://i.pravatar.cc/150?u=ao', level: 'Pro' },
    timestamp: new Date().toISOString(),
    content: 'Created a new core circuit for overhangs. Give it a try! 🧗‍♂️🔥',
    likes: 3420,
    comments: 156,
    isLiked: false,
    isSaved: false,
    attachment: {
      type: 'shared_plan',
      id: 'plan_101',
      title: 'Core Blaster V3',
      subtitle: '4 weeks · 3 sessions/week'
    }
  },
  {
    id: 'p2',
    user: { id: 'u2', username: 'Sarah Climb', avatar: 'https://i.pravatar.cc/150?u=sc', homeGym: 'The Front' },
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    content: 'Morning session done! Feeling strong on the crimps.',
    images: ['https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80'],
    likes: 89,
    comments: 12,
    isLiked: true,
    isSaved: false,
    attachment: {
      type: 'finished_session',
      id: 'log_202',
      title: 'Finger Strength Morning',
      subtitle: 'Completed in 55m · RPE 8'
    }
  },
];

interface CommunityState {
  posts: FeedPost[];
  
  // Actions
  toggleLike: (postId: string) => void;
  addPost: (newPost: Omit<FeedPost, 'id' | 'timestamp' | 'likes' | 'comments' | 'isLiked' | 'isSaved'>) => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  posts: INITIAL_POSTS,

  toggleLike: (postId) => set((state) => ({
    posts: state.posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    })
  })),

  addPost: (postData) => set((state) => {
    const newPost: FeedPost = {
      id: Math.random().toString(36).substr(2, 9), // 简单生成 ID
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      isLiked: false,
      isSaved: false,
      ...postData,
    };
    
    // 新帖子插到最前面
    return { posts: [newPost, ...state.posts] };
  }),
}));
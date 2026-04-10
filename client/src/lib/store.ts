// Using client-side storage to simulate a database for the mockup
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: 'liceu' | 'hobby' | 'sfaturi' | 'general';
  createdAt: string;
  tags: string[];
  likes: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  title: string;
  categoryId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  replies: number;
  views: number;
}

export interface QA {
  id: string;
  question: string;
  answer?: string;
  authorId: string; // "anonymous" if not logged in
  authorName: string;
  createdAt: string;
  isAnswered: boolean;
}

// Mock Data Store
interface AppState {
  users: User[];
  posts: Post[];
  comments: Comment[];
  topics: Topic[];
  qas: QA[];
  currentUser: User | null;
  
  // Actions
  login: (email: string) => void;
  logout: () => void;
  register: (username: string, email: string) => void;
  
  addPost: (post: Omit<Post, 'id' | 'createdAt' | 'likes' | 'authorId' | 'authorName'>) => void;
  deletePost: (id: string) => void;
  
  addComment: (postId: string, content: string) => void;
  addTopic: (title: string, categoryId: string) => void;
  addQA: (question: string) => void;
  answerQA: (id: string, answer: string) => void;
}

// Helper to generate random date
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: [],
      posts: [], // Empty initially as requested
      comments: [],
      topics: [],
      qas: [],
      currentUser: null,

      login: (email) => {
        // Mock login - simply sets the user if found, or creates a mock one for demo if empty
        const user = get().users.find(u => u.email === email) || {
          id: '1',
          username: email.split('@')[0],
          email: email,
          role: email.includes('admin') ? 'admin' : 'user',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        };
        set({ currentUser: user });
      },

      logout: () => set({ currentUser: null }),

      register: (username, email) => {
        const newUser: User = {
          id: Math.random().toString(36).substring(7),
          username,
          email,
          role: 'user',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        };
        set((state) => ({ users: [...state.users, newUser], currentUser: newUser }));
      },

      addPost: (postData) => {
        const user = get().currentUser;
        if (!user) return;

        const newPost: Post = {
          id: Math.random().toString(36).substring(7),
          ...postData,
          authorId: user.id,
          authorName: user.username,
          createdAt: new Date().toISOString(),
          likes: 0
        };

        set((state) => ({ posts: [newPost, ...state.posts] }));
      },

      deletePost: (id) => {
        set((state) => ({ posts: state.posts.filter(p => p.id !== id) }));
      },

      addComment: (postId, content) => {
        const user = get().currentUser;
        if (!user) return;

        const newComment: Comment = {
          id: Math.random().toString(36).substring(7),
          postId,
          authorId: user.id,
          authorName: user.username,
          content,
          createdAt: new Date().toISOString()
        };

        set((state) => ({ comments: [...state.comments, newComment] }));
      },
      
      addTopic: (title, categoryId) => {
         const user = get().currentUser;
        if (!user) return;
        
        const newTopic: Topic = {
          id: Math.random().toString(36).substring(7),
          title,
          categoryId,
          authorId: user.id,
          authorName: user.username,
          createdAt: new Date().toISOString(),
          replies: 0,
          views: 0
        };
        set((state) => ({ topics: [...state.topics, newTopic] }));
      },

      addQA: (question) => {
        const user = get().currentUser;
        const newQA: QA = {
          id: Math.random().toString(36).substring(7),
          question,
          authorId: user ? user.id : 'anon',
          authorName: user ? user.username : 'Anonim',
          createdAt: new Date().toISOString(),
          isAnswered: false
        };
        set((state) => ({ qas: [...state.qas, newQA] }));
      },

      answerQA: (id, answer) => {
        set((state) => ({
          qas: state.qas.map(qa => qa.id === id ? { ...qa, answer, isAnswered: true } : qa)
        }));
      }
    }),
    {
      name: 'jurnal-storage', // unique name
    }
  )
);

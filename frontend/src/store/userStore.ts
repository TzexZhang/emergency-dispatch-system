/**
 * ============================================
 * 用户状态管理 Store
 * ============================================
 *
 * 功能说明：
 * - 用户登录状态管理
 * - Token管理
 * - 用户信息管理
 * - 登录/登出操作
 * - 持久化存储到localStorage
 *
 * @author Emergency Dispatch Team
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface UserState {
  // 状态
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateUserAvatar: (avatarUrl: string) => void;
}

/**
 * 用户状态管理Store
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,

      // 设置用户信息
      setUser: (user) => set({ user, isAuthenticated: true }),

      // 设置Token
      setToken: (token) => set({ token }),

      // 登出
      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      // 更新用户信息
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // 更新用户头像
      updateUserAvatar: (avatarUrl) =>
        set((state) => ({
          user: state.user ? { ...state.user, avatar: avatarUrl } : null,
        })),
    }),
    {
      name: 'user-storage', // localStorage的key
      // 只持久化特定的字段
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * 辅助函数：获取当前用户
 */
export const getCurrentUser = () => {
  return useUserStore.getState().user;
};

/**
 * 辅助函数：获取Token
 */
export const getToken = () => {
  return useUserStore.getState().token;
};

/**
 * 辅助函数：检查是否已登录
 */
export const isAuthenticated = () => {
  return useUserStore.getState().isAuthenticated;
};

/**
 * 辅助函数：检查用户权限
 */
export const hasRole = (roles: string[]) => {
  const user = useUserStore.getState().user;
  return user ? roles.includes(user.role) : false;
};

/**
 * 辅助函数：检查是否是管理员
 */
export const isAdmin = () => {
  return hasRole(['admin']);
};

export default useUserStore;

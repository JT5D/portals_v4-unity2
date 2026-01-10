/**
 * Notifications Store Slice
 * Handles notification state and selection mode
 */
import { create } from 'zustand';
import { Notification } from '../../types';
import { NotificationService } from '../../services/notifications';

export interface NotificationsSlice {
    notifications: Notification[];
    selectedNotificationIds: Set<string>;
    isSelectionMode: boolean;

    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    respondToRequest: (id: string, status: 'accepted' | 'declined') => void;

    // Selection mode
    enterSelectionMode: () => void;
    exitSelectionMode: () => void;
    toggleNotificationSelection: (id: string) => void;
    selectAllNotifications: () => void;
    clearSelection: () => void;
    deleteSelectedNotifications: (userId: string) => Promise<void>;
    deleteNotification: (userId: string, id: string) => Promise<void>;
    markAllAsReadAndClear: (userId: string) => Promise<void>;
}

export const createNotificationsSlice = (set: any, get: any): NotificationsSlice => ({
    notifications: [],
    selectedNotificationIds: new Set(),
    isSelectionMode: false,

    setNotifications: (notifications) => set({ notifications }),

    addNotification: (n) => set((state: any) => ({
        notifications: [n, ...state.notifications]
    })),

    markAsRead: (id) => set((state: any) => ({
        notifications: state.notifications.map((n: Notification) =>
            n.id === id ? { ...n, read: true } : n
        )
    })),

    markAllAsRead: () => set((state: any) => ({
        notifications: state.notifications.map((n: Notification) => ({ ...n, read: true }))
    })),

    respondToRequest: (id, status) => set((state: any) => ({
        notifications: state.notifications.map((n: Notification) =>
            n.id === id ? { ...n, actionStatus: status } : n
        )
    })),

    enterSelectionMode: () => set({ isSelectionMode: true }),

    exitSelectionMode: () => set({
        isSelectionMode: false,
        selectedNotificationIds: new Set()
    }),

    toggleNotificationSelection: (id) => set((state: any) => {
        const newSet = new Set(state.selectedNotificationIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return { selectedNotificationIds: newSet };
    }),

    selectAllNotifications: () => set((state: any) => ({
        selectedNotificationIds: new Set(state.notifications.map((n: Notification) => n.id))
    })),

    clearSelection: () => set({ selectedNotificationIds: new Set() }),

    deleteSelectedNotifications: async (userId: string) => {
        const state = get();
        if (state.selectedNotificationIds.size === 0) return;

        try {
            const idsToDelete = Array.from(state.selectedNotificationIds) as string[];
            await NotificationService.deleteNotifications(userId, idsToDelete);

            set((s: any) => ({
                notifications: s.notifications.filter((n: Notification) => !idsToDelete.includes(n.id)),
                selectedNotificationIds: new Set(),
                isSelectionMode: false,
            }));
        } catch (error) {
            console.error('[NotificationsSlice] Error deleting notifications:', error);
        }
    },

    deleteNotification: async (userId: string, id: string) => {
        try {
            await NotificationService.deleteNotification(userId, id);
            set((s: any) => ({
                notifications: s.notifications.filter((n: Notification) => n.id !== id)
            }));
        } catch (error) {
            console.error('[NotificationsSlice] Error deleting notification:', error);
        }
    },

    markAllAsReadAndClear: async (userId: string) => {
        try {
            await NotificationService.markAllAsRead(userId);
            set((s: any) => ({
                notifications: s.notifications.map((n: Notification) => ({ ...n, read: true }))
            }));
        } catch (error) {
            console.error('[NotificationsSlice] Error marking all as read:', error);
        }
    },
});

// Standalone store for components that only need notifications
export const useNotificationsStore = create<NotificationsSlice>((set, get) =>
    createNotificationsSlice(set, get)
);

/**
 * Settings API
 * 
 * This module handles all settings-related API calls.
 * Currently using localStorage, but structured to easily migrate to API calls.
 * 
 * TODO: Replace localStorage calls with actual API endpoints
 */

import { userStorage } from './userStorage';

// Types matching the Settings page structure
export interface AccountSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  darkMode: boolean;
}

export interface NotificationSettings {
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  muteUntil: string | null;
}

export interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Settings API service
 * Structure ready for API integration - just replace the implementation
 */
export const settingsApi = {
  /**
   * Get user account settings
   * 
   * TODO: Replace with API call
   * const response = await apiClient.get('/api/settings/account');
   * return response.data;
   */
  async getAccountSettings(): Promise<AccountSettings | null> {
    return new Promise((resolve) => {
      // Simulate API delay
      setTimeout(() => {
        const settings = userStorage.getJSON('settings_account', null);
        resolve(settings);
      }, 100);
    });
  },

  /**
   * Update user account settings
   * 
   * TODO: Replace with API call
   * const response = await apiClient.put('/api/settings/account', settings);
   * return response.data;
   */
  async updateAccountSettings(settings: AccountSettings): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        userStorage.setJSON('settings_account', settings);
        resolve({
          success: true,
          message: 'Account settings updated successfully'
        });
      }, 500);
    });
  },

  /**
   * Get notification settings
   * 
   * TODO: Replace with API call
   * const response = await apiClient.get('/api/settings/notifications');
   * return response.data;
   */
  async getNotificationSettings(): Promise<NotificationSettings | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const settings = userStorage.getJSON('settings_notifications', null);
        resolve(settings);
      }, 100);
    });
  },

  /**
   * Update notification settings
   * 
   * TODO: Replace with API call
   * const response = await apiClient.put('/api/settings/notifications', settings);
   * return response.data;
   */
  async updateNotificationSettings(settings: NotificationSettings): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        userStorage.setJSON('settings_notifications', settings);
        resolve({
          success: true,
          message: 'Notification settings updated successfully'
        });
      }, 500);
    });
  },

  /**
   * Reset password
   * 
   * TODO: Replace with API call
   * const response = await apiClient.post('/api/settings/password/reset', request);
   * return response.data;
   */
  async resetPassword(request: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate password validation on server
        if (request.newPassword.length < 8) {
          reject({
            success: false,
            message: 'Password must be at least 8 characters long'
          });
          return;
        }

        // In real implementation, server would verify currentPassword
        // and update the password in the database
        resolve({
          success: true,
          message: 'Password updated successfully'
        });
      }, 500);
    });
  },

  /**
   * Verify current password
   * 
   * TODO: Replace with API call
   * const response = await apiClient.post('/api/settings/password/verify', { password });
   * return response.data;
   */
  async verifyPassword(password: string): Promise<{ valid: boolean }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // In real implementation, server would verify the password
        // For now, just return true
        resolve({ valid: true });
      }, 300);
    });
  }
};

/**
 * Default settings values
 * Used when no settings exist yet
 */
export const defaultAccountSettings: Partial<AccountSettings> = {
  firstName: '',
  lastName: '',
  phone: '',
  darkMode: false,
};

export const defaultNotificationSettings: NotificationSettings = {
  channels: {
    push: true,
    email: true,
    sms: false,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
  muteUntil: null,
};

/**
 * Helper to initialize settings with defaults
 */
export const initializeSettings = async (userEmail: string): Promise<void> => {
  // Check if account settings exist
  const accountSettings = await settingsApi.getAccountSettings();
  if (!accountSettings) {
    await settingsApi.updateAccountSettings({
      ...defaultAccountSettings,
      email: userEmail,
    } as AccountSettings);
  }

  // Check if notification settings exist
  const notificationSettings = await settingsApi.getNotificationSettings();
  if (!notificationSettings) {
    await settingsApi.updateNotificationSettings(defaultNotificationSettings);
  }
};

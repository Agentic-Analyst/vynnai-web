
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bell, Globe, Lock, User, Settings as SettingsIcon, Eye, EyeOff } from 'lucide-react';
import { userStorage } from '@/lib/userStorage';

// Types for settings data structure (ready for API integration)
interface AccountSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  darkMode: boolean;
}

interface NotificationSettings {
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

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type SettingsTab = 'account' | 'notifications' | 'security' | 'regional' | 'preferences';

const Settings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  
  // Account settings state
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    darkMode: false,
  });
  const [originalAccountSettings, setOriginalAccountSettings] = useState<AccountSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    darkMode: false,
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
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
  });
  const [originalNotificationSettings, setOriginalNotificationSettings] = useState<NotificationSettings>({
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
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Check if settings have been modified
  const hasAccountChanges = JSON.stringify(accountSettings) !== JSON.stringify(originalAccountSettings);
  const hasNotificationChanges = JSON.stringify(notificationSettings) !== JSON.stringify(originalNotificationSettings);
  const hasSecurityChanges = securitySettings.currentPassword !== '' || securitySettings.newPassword !== '' || securitySettings.confirmPassword !== '';

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load account settings
    const savedAccount = userStorage.getJSON('settings_account', null);
    if (savedAccount) {
      setAccountSettings(savedAccount);
      setOriginalAccountSettings(savedAccount);
      
      // Apply theme immediately on load
      if (savedAccount.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Set default email from auth and DEFAULT TO DARK MODE (Luxury Theme)
      const authEmail = localStorage.getItem('auth_email') || '';
      const defaultSettings = { ...accountSettings, email: authEmail, darkMode: true };
      setAccountSettings(defaultSettings);
      setOriginalAccountSettings(defaultSettings);
      
      // Apply default dark mode
      document.documentElement.classList.add('dark');
    }

    // Load notification settings
    const savedNotifications = userStorage.getJSON('settings_notifications', null);
    if (savedNotifications) {
      setNotificationSettings(savedNotifications);
      setOriginalNotificationSettings(savedNotifications);
    } else {
      setOriginalNotificationSettings(notificationSettings);
    }
  };

  const saveAccountSettings = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Replace with API call later
      // await api.updateAccountSettings(accountSettings);
      
      userStorage.setJSON('settings_account', accountSettings);
      setOriginalAccountSettings(accountSettings);
      
      toast({
        title: 'Settings saved',
        description: 'Your account settings have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelAccountChanges = () => {
    setAccountSettings(originalAccountSettings);
  };

  const saveNotificationSettings = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Replace with API call later
      // await api.updateNotificationSettings(notificationSettings);
      
      userStorage.setJSON('settings_notifications', notificationSettings);
      setOriginalNotificationSettings(notificationSettings);
      
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelNotificationChanges = () => {
    setNotificationSettings(originalNotificationSettings);
  };

  const handlePasswordReset = async () => {
    if (!securitySettings.currentPassword) {
      toast({
        title: 'Error',
        description: 'Please enter your current password.',
        variant: 'destructive',
      });
      return;
    }

    if (!securitySettings.newPassword) {
      toast({
        title: 'Error',
        description: 'Please enter a new password.',
        variant: 'destructive',
      });
      return;
    }

    if (securitySettings.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (!securitySettings.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please confirm your new password.',
        variant: 'destructive',
      });
      return;
    }

    // Strict password matching check
    if (securitySettings.newPassword.trim() !== securitySettings.confirmPassword.trim()) {
      toast({
        title: 'Error',
        description: 'New passwords do not match. Please check and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Replace with API call later
      // await api.resetPassword(securitySettings.currentPassword, securitySettings.newPassword);
      
      // Clear password fields and reset visibility toggles FIRST
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });

      // Show success toast after clearing
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              value={accountSettings.firstName}
              onChange={(e) => setAccountSettings({ ...accountSettings, firstName: e.target.value })}
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              value={accountSettings.lastName}
              onChange={(e) => setAccountSettings({ ...accountSettings, lastName: e.target.value })}
              placeholder="Enter your last name"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={accountSettings.email}
              onChange={(e) => setAccountSettings({ ...accountSettings, email: e.target.value })}
              placeholder="your.email@example.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="text"
              value={accountSettings.phone}
              onChange={(e) => setAccountSettings({ ...accountSettings, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Display Settings</h3>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
          </div>
          <Switch
            checked={accountSettings.darkMode}
            onCheckedChange={(checked) => {
              // Apply theme immediately
              if (checked) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }

              // Update state
              const newAccountSettings = { ...accountSettings, darkMode: checked };
              setAccountSettings(newAccountSettings);

              // Auto-save: Update original settings and storage
              // We use originalAccountSettings as base to avoid saving other pending changes
              const newOriginalSettings = { ...originalAccountSettings, darkMode: checked };
              setOriginalAccountSettings(newOriginalSettings);
              userStorage.setJSON('settings_account', newOriginalSettings);
            }}
          />
        </div>
      </div>

      {hasAccountChanges && (
        <div className="pt-4 border-t">
          <Button onClick={saveAccountSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" className="ml-2" onClick={cancelAccountChanges} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="push"
              checked={notificationSettings.channels.push}
              onCheckedChange={(checked) => 
                setNotificationSettings({
                  ...notificationSettings,
                  channels: { ...notificationSettings.channels, push: checked as boolean }
                })
              }
            />
            <div className="flex-1">
              <Label htmlFor="push" className="cursor-pointer font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications in your browser</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="email"
              checked={notificationSettings.channels.email}
              onCheckedChange={(checked) => 
                setNotificationSettings({
                  ...notificationSettings,
                  channels: { ...notificationSettings.channels, email: checked as boolean }
                })
              }
            />
            <div className="flex-1">
              <Label htmlFor="email" className="cursor-pointer font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sms"
              checked={notificationSettings.channels.sms}
              onCheckedChange={(checked) => 
                setNotificationSettings({
                  ...notificationSettings,
                  channels: { ...notificationSettings.channels, sms: checked as boolean }
                })
              }
            />
            <div className="flex-1">
              <Label htmlFor="sms" className="cursor-pointer font-medium">Text Messages</Label>
              <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Quiet Hours</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-sm text-muted-foreground">Mute notifications during specified hours</p>
            </div>
            <Switch
              checked={notificationSettings.quietHours.enabled}
              onCheckedChange={(checked) =>
                setNotificationSettings({
                  ...notificationSettings,
                  quietHours: { ...notificationSettings.quietHours, enabled: checked }
                })
              }
            />
          </div>

          {notificationSettings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <Label htmlFor="quietStart">Start Time</Label>
                <Input
                  id="quietStart"
                  type="time"
                  value={notificationSettings.quietHours.start}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      quietHours: { ...notificationSettings.quietHours, start: e.target.value }
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="quietEnd">End Time</Label>
                <Input
                  id="quietEnd"
                  type="time"
                  value={notificationSettings.quietHours.end}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      quietHours: { ...notificationSettings.quietHours, end: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Mute Notifications</h3>
        <div className="space-y-4">
          <Label htmlFor="muteUntil">Mute notifications for</Label>
          <Select
            value={notificationSettings.muteUntil || 'none'}
            onValueChange={(value) =>
              setNotificationSettings({
                ...notificationSettings,
                muteUntil: value === 'none' ? null : value
              })
            }
          >
            <SelectTrigger id="muteUntil">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not muted</SelectItem>
              <SelectItem value="30m">30 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="2h">2 hours</SelectItem>
              <SelectItem value="4h">4 hours</SelectItem>
              <SelectItem value="8h">8 hours</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasNotificationChanges && (
        <div className="pt-4 border-t">
          <Button onClick={saveNotificationSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" className="ml-2" onClick={cancelNotificationChanges} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Change Password</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={securitySettings.currentPassword}
                onChange={(e) => setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={securitySettings.newPassword}
                onChange={(e) => setSecuritySettings({ ...securitySettings, newPassword: e.target.value })}
                placeholder="Enter new password"
                className={
                  securitySettings.newPassword && securitySettings.newPassword.length < 8
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : securitySettings.newPassword.length >= 8
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : ''
                }
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {securitySettings.newPassword && securitySettings.newPassword.length < 8 && (
              <p className="text-sm text-red-500 mt-1">Password must be at least 8 characters long</p>
            )}
            {securitySettings.newPassword && securitySettings.newPassword.length >= 8 && (
              <p className="text-sm text-green-600 mt-1">✓ Password length is valid</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={securitySettings.confirmPassword}
                onChange={(e) => setSecuritySettings({ ...securitySettings, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                className={
                  securitySettings.confirmPassword && 
                  securitySettings.newPassword && 
                  securitySettings.confirmPassword !== securitySettings.newPassword
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {securitySettings.confirmPassword && 
             securitySettings.newPassword && 
             securitySettings.confirmPassword !== securitySettings.newPassword && (
              <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
            )}
            {securitySettings.confirmPassword && 
             securitySettings.newPassword && 
             securitySettings.confirmPassword === securitySettings.newPassword && (
              <p className="text-sm text-green-600 mt-1">✓ Passwords match</p>
            )}
          </div>
        </div>
      </div>

      {hasSecurityChanges && (
        <div className="pt-4 border-t">
          <Button onClick={handlePasswordReset} disabled={isSaving}>
            {isSaving ? 'Updating...' : 'Update Password'}
          </Button>
          <Button 
            variant="outline" 
            className="ml-2" 
            onClick={() => {
              setSecuritySettings({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setShowPasswords({ current: false, new: false, confirm: false });
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">This section is coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <nav className="space-y-2">
              <Button
                variant={activeTab === 'account' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                size="lg"
                onClick={() => setActiveTab('account')}
              >
                <User className="mr-2 h-5 w-5" />
                Account
              </Button>
              <Button
                variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                size="lg"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </Button>
              <Button
                variant={activeTab === 'security' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                size="lg"
                onClick={() => setActiveTab('security')}
              >
                <Lock className="mr-2 h-5 w-5" />
                Security
              </Button>
              <Button
                variant={activeTab === 'regional' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                size="lg"
                onClick={() => setActiveTab('regional')}
                disabled
              >
                <Globe className="mr-2 h-5 w-5" />
                Regional Settings
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </Button>
              <Button
                variant={activeTab === 'preferences' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                size="lg"
                onClick={() => setActiveTab('preferences')}
                disabled
              >
                <SettingsIcon className="mr-2 h-5 w-5" />
                Preferences
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </Button>
            </nav>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-6">
              {activeTab === 'account' && 'Account Settings'}
              {activeTab === 'notifications' && 'Notification Settings'}
              {activeTab === 'security' && 'Security Settings'}
              {activeTab === 'regional' && 'Regional Settings'}
              {activeTab === 'preferences' && 'Preferences'}
            </h2>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

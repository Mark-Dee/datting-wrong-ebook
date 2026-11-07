import { AuthorizedDevice } from '../types.ts';
import { getOrCreateDeviceId, detectDeviceDetails } from './offlineStorageService.ts';
import { apiFetch } from './apiClient.ts';

export const DeviceService = {
  // Get current device ID and metadata
  getCurrentDevice(): { deviceId: string; deviceName: string; platform: 'desktop' | 'mobile' | 'tablet' } {
    const deviceId = getOrCreateDeviceId();
    const { deviceName, platform } = detectDeviceDetails();
    return { deviceId, deviceName, platform };
  },

  // Fetch list of authorized devices from server
  async getAuthorizedDevices(userId: string, email?: string): Promise<{ devices: AuthorizedDevice[]; maxDevices: number }> {
    try {
      const emailQuery = email ? `?email=${encodeURIComponent(email)}` : '';
      const resp = await apiFetch(`/api/devices/${encodeURIComponent(userId)}${emailQuery}`);
      if (!resp.ok) throw new Error('Failed to fetch devices');
      return await resp.json();
    } catch {
      // Fallback with current device
      const current = this.getCurrentDevice();
      return {
        devices: [
          {
            deviceId: current.deviceId,
            userId,
            deviceName: current.deviceName + ' (This Device)',
            platform: current.platform,
            authorizedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            status: 'active',
          },
        ],
        maxDevices: 3,
      };
    }
  },

  // Revoke an old device (freeing up a slot when user changes phones)
  async revokeDevice(userId: string, deviceId: string, email?: string): Promise<boolean> {
    try {
      const resp = await apiFetch('/api/devices/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, deviceId, email }),
      });
      const data = await resp.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  },
};

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  ShieldCheck,
  BookOpen,
  LogOut,
  CheckCircle,
  Smartphone,
  Laptop,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { DeviceService } from '../services/deviceService.ts';
import { AuthorizedDevice } from '../types.ts';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReader: () => void;
  onOpenPurchase: () => void;
  onOpenAdmin?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onOpenReader,
  onOpenPurchase,
  onOpenAdmin,
}) => {
  useBodyScrollLock(isOpen);
  const { currentUser, userProfile, entitlement, signOut, isAdmin } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [devices, setDevices] = useState<AuthorizedDevice[]>([]);
  const [maxDevices, setMaxDevices] = useState(isAdmin ? 2 : 3);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const currentDevice = DeviceService.getCurrentDevice();

  useEffect(() => {
    if (isOpen && currentUser) {
      loadDevices();
    }
  }, [isOpen, currentUser]);

  const loadDevices = async () => {
    if (!currentUser) return;
    setLoadingDevices(true);
    try {
      const res = await DeviceService.getAuthorizedDevices(currentUser.uid, currentUser.email || undefined);
      setDevices(res.devices);
      if (res.maxDevices) {
        setMaxDevices(res.maxDevices);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!currentUser) return;
    if (confirm('Revoke access for this device? You will free up a device slot.')) {
      await DeviceService.revokeDevice(currentUser.uid, deviceId, currentUser.email || undefined);
      await loadDevices();
    }
  };

  if (!isOpen) return null;

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
    onClose();
  };

  const hasPurchased = Boolean(entitlement || userProfile?.hasAccess);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain bg-stone-950/70 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-md bg-[#FBF9F5] border border-[#DDD3C2] rounded-sm shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D2] bg-[#F5EFE4] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-xs bg-[#78350F] text-[#FAF7F2] flex items-center justify-center font-display-serif text-xs font-bold">
              M
            </div>
            <div>
              <h3 className="font-display-serif text-base font-bold text-[#1C1917]">
                Reader Profile & Devices
              </h3>
              <p className="font-ui-sans text-[10px] uppercase tracking-wider text-[#8C6D46] -mt-0.5">
                Mark & Alvis Reader Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE1D1] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          {/* User info card */}
          <div className="p-5 bg-[#F5EFE4] border border-[#E3D8C6] rounded-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display-serif text-lg font-bold text-[#1C1917]">
                  {userProfile?.displayName || currentUser?.displayName || 'Reader'}
                </h4>
                <p className="font-ui-sans text-xs text-[#78716C]">
                  {currentUser?.email}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E6E0D4] text-[#78350F] border border-[#D5C9B7]">
                {userProfile?.role || 'reader'}
              </span>
            </div>

            {userProfile?.phone && (
              <div className="flex items-center gap-2 text-xs font-ui-sans text-[#78716C]">
                <Phone className="w-3.5 h-3.5 text-[#8C6D46]" />
                <span>M-PESA: {userProfile.phone}</span>
              </div>
            )}
          </div>

          {/* Administrator Privileges Section (Available on all signed-in admin devices) */}
          {isAdmin && onOpenAdmin && (
            <div className="p-4.5 bg-[#F5EFE4] border border-[#DDD2BE] rounded-xs space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-ui-sans text-[11px] font-bold uppercase tracking-wider text-[#78350F] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                  Administrator Privileges
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E8EFE5] text-[#2D5A27] border border-[#C5DDC0]">
                  Active Admin Pass
                </span>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                This device is authenticated with administrator account (<strong>{currentUser?.email}</strong>). You have full privileges to review and approve M-PESA payments, inspect mapped users, and manage book settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="w-full py-2.5 px-4 rounded-xs bg-[#78350F] hover:bg-[#632B0C] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1"
              >
                <ShieldCheck className="w-4 h-4 text-[#FAF7F2]" />
                <span>Open Admin Console</span>
              </button>
            </div>
          )}

          {/* Book Access Status */}
          <div className="p-5 bg-white border border-[#E0D7C6] rounded-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-ui-sans text-xs font-bold uppercase tracking-wider text-[#57534E]">
                Book License Status
              </span>
              {hasPurchased ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8EFE5] text-[#2D5A27] border border-[#C6D8C4]">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Unlocked
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFE9DC] text-[#78716C] border border-[#DDD3C2]">
                  Unpurchased
                </span>
              )}
            </div>

            {hasPurchased ? (
              <div className="space-y-2 text-xs text-[#57534E]">
                <p>
                  You own a lifetime digital edition of <em>Dating Wrong: Why We Choose the Wrong People and Repeat the Same Relationships</em>.
                </p>
                {entitlement?.transactionCode && (
                  <p className="font-mono text-[11px] text-[#8C6D46]">
                    M-PESA Receipt: {entitlement.transactionCode}
                  </p>
                )}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReader();
                    }}
                    className="w-full py-2.5 px-4 rounded-xs bg-[#78350F] hover:bg-[#632B0C] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Open Reader Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[#57534E]">
                <p>
                  You do not yet own a digital edition of the full manuscript.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenPurchase();
                  }}
                  className="w-full py-2.5 px-4 rounded-xs bg-[#78350F] hover:bg-[#632B0C] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Purchase for 750 KSH</span>
                </button>
              </div>
            )}
          </div>

          {/* Authorized Devices (Max 2 for Admins, Max 3 for Readers) */}
          {(hasPurchased || isAdmin) && (
            <div className="p-5 bg-white border border-[#E0D7C6] rounded-xs space-y-3 font-ui-sans text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[#57534E] text-[11px]">
                  Authorized Devices ({devices.length} / {maxDevices})
                </span>
                <button
                  onClick={loadDevices}
                  className="p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
                  title="Refresh device status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed">
                {isAdmin
                  ? `As an administrator, a maximum of 2 devices are granted payment exemption pass. To authorize this device, you can revoke an unused device below.`
                  : `You can authorize up to ${maxDevices} devices using this email address for encrypted reading. If you switch phones or laptops, you can revoke an old device below.`}
              </p>

              <div className="space-y-2 pt-1">
                {devices.length === 0 ? (
                  <div className="p-3 bg-[#FAF7F0] rounded-xs text-stone-500 text-center text-[11px]">
                    This device will be authorized automatically when you click "Save Offline" in the reader.
                  </div>
                ) : (
                  devices.map((dev) => {
                    const isCurrent = dev.deviceId === currentDevice.deviceId;
                    return (
                      <div
                        key={dev.deviceId}
                        className="p-2.5 bg-[#FAF7F0] border border-[#E8E0D2] rounded-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {dev.platform === 'mobile' ? (
                            <Smartphone className="w-4 h-4 text-[#8C6D46] shrink-0" />
                          ) : (
                            <Laptop className="w-4 h-4 text-[#8C6D46] shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="font-medium text-stone-800 text-[11px] truncate">
                              {dev.deviceName} {isCurrent && '(This Device)'}
                            </p>
                            <p className="text-[10px] text-stone-400">
                              Active since {new Date(dev.authorizedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => handleRevokeDevice(dev.deviceId)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-xs transition-colors cursor-pointer"
                            title="Revoke device access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Secure Reader Notice */}
          <div className="p-3.5 bg-[#FAF7F0] border border-[#E8E0D2] rounded-xs flex items-start gap-2.5 text-xs text-[#78716C]">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#8C6D46] mt-0.5" />
            <p>
              Your digital edition is secured with cryptographic authorization and private offline encryption.
            </p>
          </div>

          {/* Sign Out Button */}
          <div className="pt-2 border-t border-[#E8E0D2]">
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="w-full py-2.5 px-4 rounded-xs border border-[#D9CEBC] hover:bg-[#EFE8DC] text-[#57534E] hover:text-[#1C1917] font-ui-sans font-medium text-xs tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'Signing out...' : 'Sign Out of Account'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
}) => {
  useBodyScrollLock(isOpen);
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'signin') {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('Please enter both your email address and password.');
        return;
      }
      setLoading(true);
      try {
        await signIn(email.trim(), password);
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setErrorMsg('Invalid email or password. Please verify your credentials.');
        } else {
          setErrorMsg(err.message || 'Unable to sign in. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name for the personalized edition.');
        return;
      }
      if (!email.trim()) {
        setErrorMsg('Please provide a valid email address.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      setLoading(true);
      try {
        await signUp(email.trim(), password, fullName.trim(), phone.trim());
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('An account with this email already exists. Please sign in instead.');
        } else {
          setErrorMsg(err.message || 'Registration failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter your account email address.');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email.trim());
        setSuccessMsg('Password reset instructions have been sent to your email.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Unable to send reset email.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain bg-stone-950/70 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-md bg-[#FBF9F5] border border-[#DDD3C2] rounded-sm shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D2] bg-[#F5EFE4]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-xs bg-[#78350F] text-[#FAF7F2] flex items-center justify-center font-display-serif text-xs font-bold">
              M
            </div>
            <div>
              <h3 className="font-display-serif text-base font-bold text-[#1C1917]">
                {mode === 'signin' && 'Sign In to Your Library'}
                {mode === 'signup' && 'Create Your Reader Account'}
                {mode === 'forgot' && 'Reset Your Password'}
              </h3>
              <p className="font-ui-sans text-[10px] uppercase tracking-wider text-[#8C6D46] -mt-0.5">
                Dating Wrong • Authorized Reader
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE1D1] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-[#FBF0EE] border-l-2 border-[#B91C1C] rounded-r-xs flex items-start gap-2.5 text-xs text-[#991B1B]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-[#EDF7ED] border-l-2 border-[#2E7D32] rounded-r-xs flex items-start gap-2.5 text-xs text-[#1B5E20]">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block font-ui-sans text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#A8A29E] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Grace Mwangi"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#78350F]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-ui-sans text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A8A29E] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#78350F]"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block font-ui-sans text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                  M-PESA Phone Number <span className="text-[#A8A29E] font-normal">(Optional for checkout)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#A8A29E] absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#78350F]"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-ui-sans text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-ui-sans text-xs text-[#8C6D46] hover:text-[#78350F] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A8A29E] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#78350F]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xs bg-[#78350F] hover:bg-[#632B0C] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {mode === 'signin' && 'Sign In to Read'}
                  {mode === 'signup' && 'Create Account & Continue'}
                  {mode === 'forgot' && 'Send Reset Email'}
                </span>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 pt-5 border-t border-[#E8E0D2] text-center text-xs font-ui-sans text-[#78716C]">
            {mode === 'signin' && (
              <p>
                Don’t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-[#78350F] hover:underline cursor-pointer"
                >
                  Create one here
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-[#78350F] hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-[#78350F] hover:underline cursor-pointer"
                >
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

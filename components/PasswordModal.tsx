import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FaTimes, FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaCheck } from 'react-icons/fa';
import { validatePasswordStrength } from '@/lib/auth';

interface PasswordModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'set' | 'verify';
  onPasswordSubmit: (password: string) => Promise<void>;
  walletAddress?: string;
}

export default function PasswordModal({ 
  open, 
  onClose, 
  mode, 
  onPasswordSubmit,
  walletAddress 
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: false, errors: [] });

  useEffect(() => {
    if (mode === 'set' && password) {
      setPasswordStrength(validatePasswordStrength(password));
    }
  }, [password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'set') {
      if (!passwordStrength.isValid) {
        setError('Please meet all password requirements');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    try {
      await onPasswordSubmit(password);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      // Handle error with proper type checking
      let errorMessage = 'An error occurred';
      if (err && typeof err === 'object' && 'message' in err) {
        const message = err.message;
        if (typeof message === 'string') {
          errorMessage = message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (!password) return 'bg-zinc-800';
    const strength = passwordStrength.errors.length;
    if (strength >= 4) return 'bg-red-500';
    if (strength >= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (!password) return '';
    const strength = passwordStrength.errors.length;
    if (strength >= 4) return 'Weak';
    if (strength >= 2) return 'Medium';
    return 'Strong';
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl border border-yellow-400/20 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-yellow-400/10 to-yellow-600/5">
                <button
                  className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <FaTimes />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-400/20 rounded-2xl flex items-center justify-center">
                    <FaShieldAlt className="text-yellow-400 w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {mode === 'set' ? 'Set Your Password' : 'Enter Your Password'}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      {mode === 'set' 
                        ? 'Create a secure password for your wallet' 
                        : 'Verify your identity to access dashboard'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {walletAddress && (
                  <div className="bg-zinc-800/50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-zinc-500">Connected Wallet</p>
                    <p className="text-sm text-zinc-300 font-mono mt-1">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  </div>
                )}

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-zinc-500 w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-red-400 text-sm mt-2 bg-red-400/10 p-3 rounded-xl">
                    {error}
                  </div>
                )}

                {/* Password Strength Indicator */}
                {mode === 'set' && password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Password Strength</span>
                      <span className={`text-xs font-medium ${
                        getStrengthColor() === 'bg-green-500' ? 'text-green-400' :
                        getStrengthColor() === 'bg-yellow-500' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${getStrengthColor()}`}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: passwordStrength.errors.length >= 4 ? '25%' :
                                 passwordStrength.errors.length >= 2 ? '60%' :
                                 '100%'
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    
                    {/* Requirements */}
                    <div className="mt-3 space-y-1">
                      {[
                        { test: password.length >= 8, text: 'At least 8 characters' },
                        { test: /[A-Z]/.test(password), text: 'One uppercase letter' },
                        { test: /[a-z]/.test(password), text: 'One lowercase letter' },
                        { test: /[0-9]/.test(password), text: 'One number' },
                        { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'One special character' }
                      ].map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            req.test ? 'bg-green-500/20' : 'bg-zinc-800'
                          }`}>
                            {req.test && <FaCheck className="text-green-400 w-2.5 h-2.5" />}
                          </div>
                          <span className={`text-xs ${
                            req.test ? 'text-green-400' : 'text-zinc-500'
                          }`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                {mode === 'set' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="text-zinc-500 w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all"
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-medium rounded-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    loading ? 'animate-pulse' : ''
                  }`}
                >
                  {loading ? 'Processing...' : mode === 'set' ? 'Set Password' : 'Verify Password'}
                </button>

                {/* Footer Text */}
                {mode === 'verify' && (
                  <p className="text-xs text-zinc-500 text-center mt-4">
                    Forgot your password? Disconnect and reconnect your wallet to reset.
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
import { motion, AnimatePresence } from 'framer-motion';
import { useConnect, useAccount } from 'wagmi';
import { FaTimes } from 'react-icons/fa';
import { FaWallet } from 'react-icons/fa6';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WalletModal({ open, onClose }: WalletModalProps) {
  const { connect, connectors, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  // Filter out the injected connector and any other connectors we want to hide
  const filteredConnectors = connectors.filter(connector => 
    connector.id !== 'injected' && connector.name !== 'Mock Connector'
  );

  // Define which paths should redirect to dashboard after connection
  const shouldRedirectToDashboard = (path: string) => {
    // Only redirect to dashboard if user is on the home page
    return path === '/';
  };

  // When wallet connects, close modal and only redirect if on home page
  useEffect(() => {
    if (isConnected && address && open) {
      toast.success('Wallet connected!');
      onClose();
      
      // Debug: Log current pathname and redirect decision
      console.log('WalletModal - Current pathname:', pathname);
      console.log('WalletModal - Should redirect to dashboard:', shouldRedirectToDashboard(pathname));
      
      // Only redirect to dashboard if on home page
      if (shouldRedirectToDashboard(pathname)) {
        console.log('WalletModal - Redirecting to dashboard');
        router.push('/dashboard');
      } else {
        console.log('WalletModal - Staying on current page:', pathname);
      }
    }
  }, [isConnected, address, open, onClose, router, pathname]);

  const handleSelect = async (connector: any) => {
    try {
      await connect({ connector });
      // Modal will close automatically when wallet connects
    } catch (err) {
      console.error(err);
      toast.error('Failed to connect wallet');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-[#111111] border border-yellow-400/10 shadow-xl p-6"
          >
            <button
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300"
              onClick={onClose}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-yellow-200/20 rounded-full flex items-center justify-center">
                  <FaWallet className="text-yellow-200 w-5 h-5" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white">
                Connect Wallet
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Choose your preferred wallet to continue
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {filteredConnectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleSelect(connector)}
                  disabled={isPending}
                  className="w-full px-4 py-3.5 bg-black/60 backdrop-blur-xl border border-yellow-400/10 hover:bg-black/40 hover:border-yellow-400/20 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>{connector.name}</span>
                  {isPending && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-5 pt-4 border-t border-zinc-800/70">
              <p className="text-xs text-zinc-500 text-center">
                By connecting your wallet, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
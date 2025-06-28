import { motion, AnimatePresence } from 'framer-motion';
import { useConnect } from 'wagmi';
import { FaTimes } from 'react-icons/fa';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WalletModal({ open, onClose }: WalletModalProps) {
  const { connect, connectors, isPending } = useConnect();

  const handleSelect = async (connector: any) => {
    try {
      await connect({ connector });
      onClose();
    } catch (err) {
      console.error(err);
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
            <h2 className="text-xl font-semibold mb-4 text-white text-center">Connect Wallet</h2>
            <div className="flex flex-col gap-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleSelect(connector)}
                  disabled={isPending}
                  className="w-full px-4 py-3 bg-black/60 backdrop-blur-xl border border-yellow-400/10 hover:bg-black/40 hover:border-yellow-400/20 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connector.name}
                  {isPending && ' (connecting)'}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
'use client';

import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import WalletModal from '@/components/WalletModal';
import { Wallet, LogOut, Copy } from 'lucide-react';
import { toast } from 'sonner';

export const WalletConnectButton: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showModal, setShowModal] = useState(false);

  const handleDisconnect = () => {
    disconnect();
    toast.success('Wallet disconnected');
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={copyAddress}
          className="font-mono text-sm bg-zinc-900/80 backdrop-blur-sm border-zinc-800 text-zinc-400 hover:text-yellow-400 hover:border-yellow-400/50 transition-all duration-200"
        >
          <Copy className="w-3 h-3 mr-1" />
          {`${address.slice(0, 6)}...${address.slice(-4)}`}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 text-red-400 hover:text-red-500 hover:border-red-500/50 transition-all duration-200"
        >
          <LogOut className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-semibold shadow-lg hover:shadow-yellow-500/20 transition-all duration-200 relative overflow-hidden group flex items-center space-x-2"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
        <Wallet className="w-4 h-4" />
        <span>Connect Wallet</span>
      </Button>
      
      <WalletModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}; 
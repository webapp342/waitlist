'use client'

import { useAccount, useChainId, useChains } from 'wagmi';
import { useEffect } from 'react';

export default function DebugChain() {
  const { address, isConnected, chain, connector } = useAccount();
  const chainId = useChainId();
  const chains = useChains();

  useEffect(() => {
    if (isConnected) {
      console.log('=== CHAIN DEBUG INFO ===');
      console.log('useChainId():', chainId);
      console.log('chain from useAccount():', chain);
      console.log('chain?.id:', chain?.id);
      console.log('connector:', connector);
      console.log('address:', address);
      console.log('configured chains:', chains);
      console.log('======================');
    }
  }, [isConnected, chainId, chain, connector, address, chains]);

  if (!isConnected) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-sm">
      <h3 className="font-bold mb-2">Chain Debug Info:</h3>
      <div>useChainId: {chainId}</div>
      <div>chain?.id: {chain?.id}</div>
      <div>chain?.name: {chain?.name}</div>
      <div>connector: {connector?.name}</div>
      <div>Is BSC: {(chain?.id || chainId) === 56 ? 'YES' : 'NO'}</div>
    </div>
  );
} 
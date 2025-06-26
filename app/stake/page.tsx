'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Particles from "@/components/ui/particles";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';

export default function StakePage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [stakeAmount, setStakeAmount] = useState('');
  
  const { 
    walletState, 
    userData, 
    approveTokens,
    stakeTokens,
    claimRewards,
    unstakeTokens,
    emergencyWithdraw,
    getAllowance
  } = useWallet();

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null; // Don't render anything while redirecting
  }

  // Format token amounts from wei to ether
  const formatTokenAmount = (amount: string) => {
    try {
      if (!amount || amount === '0') return '0.00';
      // If already formatted (contains decimal), return as is
      if (amount.includes('.')) {
        const num = parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toFixed(2);
      }
      // If in wei format, convert using ethers
      const formatted = ethers.formatEther(amount);
      const num = parseFloat(formatted);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return '0.00';
    }
  };

  // Format BNB fee amounts
  const formatBNBAmount = (amount: string) => {
    try {
      if (!amount || amount === '0') return '0.00';
      const formatted = ethers.formatEther(amount);
      const num = parseFloat(formatted);
      return isNaN(num) ? '0.00' : num.toFixed(6); // More precision for BNB
    } catch (error) {
      console.error('Error formatting BNB amount:', error);
      return '0.00';
    }
  };

  // Handle approve and stake process
  const handleApproveAndStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      return;
    }

    try {
      // First approve tokens
      const approveSuccess = await approveTokens(stakeAmount);
      if (approveSuccess) {
        // Then stake tokens
        await stakeTokens(stakeAmount);
        setStakeAmount(''); // Clear input on success
      }
    } catch (error) {
      console.error('Approve and stake error:', error);
    }
  };

  // Handle unstake for a specific stake
  const handleUnstake = async (stakeId: string) => {
    console.log('🔄 Unstaking with ID:', stakeId);
    
    try {
      // Check minimum staking period
      const stake = userData.stakes.find((s: any) => s.stakeId === stakeId);
      if (stake) {
        const stakeTimestamp = Number(stake.timestamp);
        const currentTime = Math.floor(Date.now() / 1000);
        const stakingPeriod = currentTime - stakeTimestamp;
        const minPeriod = Number(userData.minimumStakingPeriod);
        
        console.log('📊 Stake Details:', {
          stakeId,
          stakeTimestamp,
          currentTime,
          stakingPeriod,
          minPeriod,
          canUnstake: stakingPeriod >= minPeriod
        });
        
        if (stakingPeriod < minPeriod) {
          const remainingTime = minPeriod - stakingPeriod;
          const remainingDays = Math.ceil(remainingTime / 86400);
          console.warn(`⚠️ Cannot unstake yet. Need to wait ${remainingDays} more days`);
          // We can still try the transaction - let the contract handle the validation
        }
      }
      
      // Convert stakeId to number for the contract call
      const stakeIdNumber = parseInt(stakeId);
      console.log('🔢 Converted stake ID to number:', stakeIdNumber);
      
      // Check BNB fee
      const requiredFee = userData.feeInfo?.unstakingFeeBNB || '0';
      console.log('💰 Required BNB fee:', formatBNBAmount(requiredFee), 'BNB');
      console.log('💰 Current BNB balance:', formatTokenAmount(userData.bnbBalance || '0'), 'BNB');
      
      const result = await unstakeTokens(stakeIdNumber.toString());
      console.log('✅ Unstake result:', result);
    } catch (error: any) {
      console.error('❌ Unstake error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
    }
  };

  // Handle emergency withdraw for a specific stake
  const handleEmergencyWithdraw = async (stakeId: string) => {
    console.log('🚨 Emergency withdraw with ID:', stakeId);
    try {
      const result = await emergencyWithdraw(stakeId);
      console.log('✅ Emergency withdraw result:', result);
    } catch (error) {
      console.error('❌ Emergency withdraw error:', error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-12 md:pt-24">
      <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Stake Your Tokens
          </h1>
          <p className="text-gray-400">Stake tokens and earn rewards on BSC Testnet</p>
        </div>

        {/* Error Message */}
        {walletState.error && (
          <div className="w-full max-w-md mb-4">
            <div className="p-4 rounded-xl text-center font-medium bg-red-500/20 text-red-300 border border-red-500/50">
              {walletState.error}
            </div>
          </div>
        )}

        {/* Staking Card */}
        <div className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="space-y-6">
            {/* Wallet Info */}
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
              <p className="font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
            </div>

            {/* Balance Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Available Balance</p>
                <p className="font-semibold">{formatTokenAmount(userData.tokenBalance)} TOKENS</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Staked</p>
                <p className="font-semibold">{formatTokenAmount(userData.stakedAmount)} TOKENS</p>
              </div>
            </div>

            {/* Stake Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount to Stake</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="flex-1"
                  disabled={walletState.loading}
                />
                <Button
                  variant="outline"
                  onClick={() => setStakeAmount(userData.tokenBalance)}
                  className="px-4"
                  disabled={walletState.loading}
                >
                  MAX
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Staking Fee: {userData.feeInfo?.stakingFeeBNB ? `${formatBNBAmount(userData.feeInfo.stakingFeeBNB)} BNB` : '0.005 BNB'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleApproveAndStake}
                disabled={walletState.loading || !stakeAmount || parseFloat(stakeAmount) <= 0}
              >
                {walletState.loading ? 'Processing...' : 'Approve & Stake'}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={claimRewards}
                disabled={walletState.loading || parseFloat(userData.pendingRewards) <= 0}
              >
                Claim Rewards ({formatTokenAmount(userData.pendingRewards)} TOKENS)
              </Button>
            </div>

            {/* Rewards Info */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
              <p className="text-sm text-gray-400 mb-1">Pending Rewards</p>
              <p className="font-semibold text-yellow-400">{formatTokenAmount(userData.pendingRewards)} TOKENS</p>
            </div>

            {/* Your Stakes */}
            {userData.stakes && userData.stakes.length > 0 && (
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Your Stakes ({userData.stakes.length})</h3>
                <div className="space-y-3">
                  {userData.stakes.map((stake: any, index) => {
                    if (!stake.isActive) return null;
                    
                    return (
                      <div key={index} className="bg-white/5 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium">{formatTokenAmount(stake.amount)} TOKENS</p>
                            <p className="text-xs text-gray-400">
                              Stake ID: {stake.stakeId}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(Number(stake.timestamp) * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnstake(stake.stakeId)}
                            disabled={walletState.loading}
                            className="text-xs"
                          >
                            Unstake
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleEmergencyWithdraw(stake.stakeId)}
                            disabled={walletState.loading}
                            className="text-xs"
                          >
                            Emergency
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Fee: {userData.feeInfo?.unstakingFeeBNB ? `${formatBNBAmount(userData.feeInfo.unstakingFeeBNB)} BNB` : '0.005 BNB'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BNB Balance Info */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <p className="text-sm text-gray-400 mb-1">BNB Balance</p>
              <p className="font-semibold text-blue-400">{formatTokenAmount(userData.bnbBalance || '0')} BNB</p>
              <p className="text-xs text-gray-400 mt-1">
                {parseFloat(userData.bnbBalance || '0') < 0.01 && "⚠️ Low BNB balance for fees"}
              </p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center text-sm text-gray-400 max-w-md">
          <p className="mb-2">
            🔒 Stake your tokens to earn rewards
          </p>
          <p>
            💡 APR: 10% | Minimum stake: 100 TOKENS
          </p>
          <p className="mt-2 text-yellow-400">
            ⚠️ BNB Fee System - Fees required for staking/unstaking
          </p>
          <p className="text-xs mt-1">
            Min staking period: {userData.minimumStakingPeriod ? `${Math.floor(Number(userData.minimumStakingPeriod) / 86400)} days` : 'Loading...'}
          </p>
        </div>
      </section>

      <Footer />

      <Particles
        quantityDesktop={150}
        quantityMobile={50}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
    </main>
  );
} 
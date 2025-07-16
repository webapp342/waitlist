'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BNBFeeInfo } from '@/types';

interface UserData {
  address: string;
  tokenBalance: string;
  stakedAmount: string;
  pendingRewards: string;
  stakes: any[];
  bnbBalance?: string;
  feeInfo?: BNBFeeInfo;
  minimumStakingPeriod?: string;
}

interface StakingInterfaceProps {
  userData: UserData;
  approveTokens: (amount: string) => Promise<boolean>;
  stakeTokens: (amount: string) => Promise<boolean>;
  claimRewards: () => Promise<boolean>;
  unstakeTokens: (stakeId: string) => Promise<boolean>;
  emergencyWithdraw?: (stakeId: string) => Promise<boolean>;
  getAllowance: () => Promise<string>;
  loading: boolean;
  networkDetails?: {
    nativeToken: string;
    tokenSymbol: string;
  };
}

const StakingInterface = ({ 
  userData, 
  approveTokens, 
  stakeTokens, 
  claimRewards, 
  unstakeTokens, 
  emergencyWithdraw,
  getAllowance,
  loading,
  networkDetails
}: StakingInterfaceProps) => {
  const [stakeAmount, setStakeAmount] = useState('');
  const [allowance, setAllowance] = useState('0');
  const [status, setStatus] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);

  // COMPREHENSIVE DEBUGGING LOGS
  console.log('🔍 StakingInterface Debug - Full userData:', userData);
  console.log('📋 Stakes Raw Data:', userData.stakes);
  console.log('💰 BNB Fee Info:', userData.feeInfo);
  console.log('📊 Stakes Array Info:', {
    isArray: Array.isArray(userData.stakes),
    length: userData.stakes?.length || 0,
    type: typeof userData.stakes
  });

  // Filter active stakes with detailed logging - BUT THESE ARE ALREADY ACTIVE!
  const activeStakes = userData.stakes ? userData.stakes.map((stake: any) => {
    console.log('🔍 Processing stake:', {
      stakeId: stake.stakeId,
      amount: stake.amount,
      isActive: stake.isActive,
      timestamp: stake.timestamp,
      rewardDebt: stake.rewardDebt
    });
    return stake;
  }) : [];

  // DETAILED LOGGING FOR DEBUGGING
  console.log('🔥 Active Stakes Result:', activeStakes);
  console.log('📊 Stakes Count Summary:', {
    total: userData.stakes?.length || 0,
    active: activeStakes.length,
    allAreActive: activeStakes.every((s: any) => s.isActive)
  });

  // Log each active stake individually
  activeStakes.forEach((stake: any, index: number) => {
    console.log(`🎯 Active Stake ${index + 1}:`, {
      stakeId: stake.stakeId,
      amount: ethers.formatEther(stake.amount),
      timestamp: stake.timestamp,
      isActive: stake.isActive,
      rewardDebt: ethers.formatEther(stake.rewardDebt),
      date: new Date(Number(stake.timestamp) * 1000).toLocaleString()
    });
  });

  // Load allowance
  useEffect(() => {
    const loadAllowance = async () => {
      try {
        const currentAllowance = await getAllowance();
        setAllowance(currentAllowance);
        console.log('💰 Current Allowance:', currentAllowance);
      } catch (error) {
        console.error('❌ Error loading allowance:', error);
        setAllowance('0');
      }
    };
    loadAllowance();
  }, [getAllowance, userData]);

  const showStatus = (message: string, isError: boolean = false) => {
    setStatus(message);
    setTimeout(() => setStatus(''), 5000);
  };

  const handleApprove = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      showStatus('Please enter a valid amount', true);
      return;
    }

    setIsApproving(true);
    try {
      console.log('✅ Approving tokens:', stakeAmount);
      showStatus('Approving tokens...');
      const approveSuccess = await approveTokens(stakeAmount);
      
      if (approveSuccess) {
        showStatus('Tokens approved successfully! You can now stake.');
        const newAllowance = await getAllowance();
        setAllowance(newAllowance);
      } else {
        showStatus('Token approval failed', true);
      }
    } catch (error) {
      console.error('Error in approval process:', error);
      showStatus('An error occurred during the approval process', true);
    } finally {
      setIsApproving(false);
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      showStatus('Please enter a valid amount', true);
      return;
    }

    // Check BNB balance for fee
    if (userData.feeInfo && userData.bnbBalance) {
      const stakingFee = parseFloat(ethers.formatEther(userData.feeInfo.stakingFeeBNB));
      const bnbBalance = parseFloat(userData.bnbBalance);
      
      if (bnbBalance < stakingFee) {
        showStatus(`Insufficient BNB for staking fee. Required: ${stakingFee.toFixed(6)} BNB`, true);
        return;
      }
    }

    // Check allowance
    const allowanceNum = parseFloat(allowance);
    const stakeNum = parseFloat(stakeAmount);
    if (allowanceNum < stakeNum) {
      showStatus('Please approve tokens first', true);
      return;
    }

    setIsStaking(true);
    try {
      console.log('🔒 Staking tokens:', stakeAmount);
      showStatus('Staking tokens...');
      const stakeSuccess = await stakeTokens(stakeAmount);
      
      if (stakeSuccess) {
        showStatus('Tokens staked successfully! 🚀');
        setStakeAmount('');
        const newAllowance = await getAllowance();
        setAllowance(newAllowance);
      } else {
        showStatus('Staking failed', true);
      }
    } catch (error) {
      console.error('Error in stake process:', error);
      showStatus('An error occurred during the staking process', true);
    } finally {
      setIsStaking(false);
    }
  };

  const handleClaimRewards = async () => {
    if (parseFloat(userData.pendingRewards) <= 0) {
      showStatus('No rewards to claim', true);
      return;
    }

    console.log('🎁 Claiming rewards...');
    showStatus('Claiming rewards...');
    const success = await claimRewards();
    
    if (success) {
      showStatus('Rewards claimed successfully! 🎁');
    }
  };

  const handleWithdraw = async (stakeId: string) => {
    // Check balance for unstaking fee
    if (userData.feeInfo && userData.bnbBalance) {
      const unstakingFee = parseFloat(ethers.formatEther(userData.feeInfo.unstakingFeeBNB));
      const balance = parseFloat(userData.bnbBalance);
      const feeToken = networkDetails?.nativeToken || 'BNB';
      
      if (balance < unstakingFee) {
        showStatus(`Insufficient ${feeToken} for unstaking fee. Required: ${unstakingFee.toFixed(6)} ${feeToken}`, true);
        return;
      }
    }

    console.log('🔓 Withdrawing stake ID:', stakeId);
    showStatus(`Withdrawing stake #${stakeId}...`);
    const success = await unstakeTokens(stakeId);
    
    if (success) {
      showStatus(`Stake #${stakeId} withdrawn successfully! 💰`);
    }
  };

  const handleEmergencyWithdraw = async (stakeId: string) => {
    if (!emergencyWithdraw) {
      showStatus('Emergency withdraw not available', true);
      return;
    }

    console.log('🚨 Emergency withdrawing stake ID:', stakeId);
    showStatus(`Emergency withdrawing stake #${stakeId}...`);
    const success = await emergencyWithdraw(stakeId);
    
    if (success) {
      showStatus(`Emergency withdrawal of stake #${stakeId} successful! 🚨`);
    }
  };

  const formatNumber = (num: string | number): string => {
    return parseFloat(num.toString()).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const formatBNB = (wei: string): string => {
    return parseFloat(ethers.formatEther(wei)).toFixed(6);
  };

  const hasEnoughAllowance = parseFloat(allowance) >= parseFloat(stakeAmount || '0');

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
      {/* Status Messages */}
      {status && (
        <div className="mb-6 p-4 rounded-xl text-center font-medium bg-blue-500/20 text-blue-300 border border-blue-500/50">
          {status}
        </div>
      )}

      {/* User Info */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 p-4 rounded-xl">
          <h4 className="text-sm text-gray-400 mb-1">Your Balance</h4>
          <p className="text-xl font-semibold">{formatNumber(userData.tokenBalance)} Tokens</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl">
          <h4 className="text-sm text-gray-400 mb-1">Total Staked</h4>
          <p className="text-xl font-semibold">{formatNumber(userData.stakedAmount)} Tokens</p>
        </div>
      </div>

      {/* Staking Interface */}
      <div className="space-y-6">
        {/* Staking Input */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Stake Tokens</h3>
          <div className="space-y-4">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Enter amount to stake"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            {/* Fee Info */}
            {userData.feeInfo && (
              <div className="text-sm text-gray-400">
                Staking Fee: {formatBNB(userData.feeInfo.stakingFeeBNB)} {networkDetails?.nativeToken || 'BNB'}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!hasEnoughAllowance && (
                <button
                  onClick={handleApprove}
                  disabled={loading || isApproving || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving ? 'Approving...' : 'Approve Tokens'}
                </button>
              )}

              <button
                onClick={handleStake}
                disabled={loading || isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0 || !hasEnoughAllowance}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStaking ? 'Staking...' : 'Stake Tokens'}
              </button>
            </div>
          </div>
        </div>

        {/* Rewards Section */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">Pending Rewards</h3>
            <p className="text-xl font-semibold text-purple-400">
              {formatNumber(userData.pendingRewards)} Tokens
            </p>
          </div>
          <button
            onClick={handleClaimRewards}
            disabled={loading || parseFloat(userData.pendingRewards) <= 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Claim Rewards
          </button>
        </div>

        {/* Active Stakes */}
        {userData.stakes && userData.stakes.length > 0 && (
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-xl font-semibold text-white mb-4">Your Stakes</h3>
            <div className="space-y-4">
              {userData.stakes.map((stake: any, index: number) => (
                <div key={stake.stakeId} className="bg-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Stake #{stake.stakeId}</span>
                    <span className="font-semibold">{formatNumber(ethers.formatEther(stake.amount))} Tokens</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
                    <span>Staked on: {new Date(Number(stake.timestamp) * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWithdraw(stake.stakeId)}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium py-2 px-4 rounded-lg transition-all duration-200"
                    >
                      Withdraw
                    </button>
                    {emergencyWithdraw && (
                      <button
                        onClick={() => handleEmergencyWithdraw(stake.stakeId)}
                        className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-medium py-2 px-4 rounded-lg transition-all duration-200"
                      >
                        Emergency Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StakingInterface; 
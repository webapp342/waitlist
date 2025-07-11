import { NextRequest, NextResponse } from 'next/server';
import { referralService } from '@/lib/supabase';
import { 
  setClaimableAmountOnContract, 
  getClaimableAmountFromContract,
  getTotalClaimedFromContract
} from '@/lib/claimContract';

/**
 * POST /api/claim
 * Set claimable amount for a user based on database calculations
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // 1. Check if user already has claimable amount
    const existingClaimable = await getClaimableAmountFromContract(walletAddress);
    if (parseFloat(existingClaimable) > 0) {
      return NextResponse.json({
        success: true,
        claimableAmount: parseFloat(existingClaimable),
        message: 'Claimable amount already set'
      });
    }

    // 2. Get user's earned USDT from database
    const stats = await referralService.getUserReferralStats(walletAddress);
    const earnedUSDT = parseFloat(stats.totalRewards) / 10;

    if (earnedUSDT <= 0) {
      return NextResponse.json(
        { error: 'No USDT earned to claim' },
        { status: 400 }
      );
    }

    // 3. Set claimable amount on contract
    const txHash = await setClaimableAmountOnContract(walletAddress, earnedUSDT);

    return NextResponse.json({
      success: true,
      claimableAmount: earnedUSDT,
      transactionHash: txHash,
      message: 'Claimable amount set successfully'
    });

  } catch (error) {
    console.error('Error in claim POST:', error);
    return NextResponse.json(
      { error: 'Failed to set claimable amount' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/claim?wallet=0x...
 * Get user's claimable and claimed amounts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get data from both database and contract
    const [
      dbStats,
      contractClaimable,
      contractClaimed
    ] = await Promise.all([
      referralService.getUserReferralStats(walletAddress),
      getClaimableAmountFromContract(walletAddress),
      getTotalClaimedFromContract(walletAddress)
    ]);

    const earnedUSDT = parseFloat(dbStats.totalRewards) / 10;

    return NextResponse.json({
      database: {
        totalRewards: dbStats.totalRewards,
        earnedUSDT: earnedUSDT
      },
      contract: {
        claimableAmount: contractClaimable,
        totalClaimed: contractClaimed
      },
      canClaim: parseFloat(contractClaimable) > 0
    });

  } catch (error) {
    console.error('Error in claim GET:', error);
    return NextResponse.json(
      { error: 'Failed to get claim data' },
      { status: 500 }
    );
  }
} 
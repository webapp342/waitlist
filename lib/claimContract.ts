import { ethers } from 'ethers';

// Contract ABI (sadece ihtiyacımız olan fonksiyonlar)
const CLAIM_CONTRACT_ABI = [
  "function setClaimableAmount(address user, uint256 amount) external",
  "function claimUSDT() external",
  "function getClaimableAmount(address user) external view returns (uint256)",
  "function getTotalClaimed(address user) external view returns (uint256)",
  "function getContractBalance() external view returns (uint256)",
  "event ClaimableAmountSet(address indexed user, uint256 amount)",
  "event USDTClaimed(address indexed user, uint256 amount)"
];

// Contract addresses (from environment)
const CLAIM_CONTRACT_ADDRESS = "0xbfE9400203C02e7b6cD4c38c832EC170308E4fb1"; // BSC Mainnet
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// BSC RPC URL (Mainnet)
const BSC_RPC_URL = "https://bsc-dataseed1.binance.org/";

/**
 * Set claimable amount for a user (admin only)
 */
export async function setClaimableAmountOnContract(
  userAddress: string, 
  usdtAmount: number
): Promise<string> {
  if (!CLAIM_CONTRACT_ADDRESS || !ADMIN_PRIVATE_KEY) {
    throw new Error('Contract address or admin key not configured');
  }

  try {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    
    // Connect to contract
    const contract = new ethers.Contract(
      CLAIM_CONTRACT_ADDRESS, 
      CLAIM_CONTRACT_ABI, 
      adminWallet
    );

    // Convert USDT amount to wei (18 decimals)
    const amountInWei = ethers.parseUnits(usdtAmount.toString(), 18);

    // Call setClaimableAmount
    const tx = await contract.setClaimableAmount(userAddress, amountInWei);
    
    console.log('Setting claimable amount:', {
      user: userAddress,
      amount: usdtAmount,
      txHash: tx.hash
    });

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    console.log('Claimable amount set successfully:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return receipt.hash;
  } catch (error) {
    console.error('Error setting claimable amount:', error);
    throw error;
  }
}

/**
 * Get claimable amount for a user
 */
export async function getClaimableAmountFromContract(
  userAddress: string
): Promise<string> {
  if (!CLAIM_CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured');
  }

  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const contract = new ethers.Contract(
      CLAIM_CONTRACT_ADDRESS, 
      CLAIM_CONTRACT_ABI, 
      provider
    );

    const amountInWei = await contract.getClaimableAmount(userAddress);
    const amountInUSDT = ethers.formatUnits(amountInWei, 18);
    
    return amountInUSDT;
  } catch (error) {
    console.error('Error getting claimable amount:', error);
    throw error;
  }
}

/**
 * Get total claimed amount for a user
 */
export async function getTotalClaimedFromContract(
  userAddress: string
): Promise<string> {
  if (!CLAIM_CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured');
  }

  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const contract = new ethers.Contract(
      CLAIM_CONTRACT_ADDRESS, 
      CLAIM_CONTRACT_ABI, 
      provider
    );

    const amountInWei = await contract.getTotalClaimed(userAddress);
    const amountInUSDT = ethers.formatUnits(amountInWei, 18);
    
    return amountInUSDT;
  } catch (error) {
    console.error('Error getting total claimed:', error);
    throw error;
  }
}

/**
 * Get contract USDT balance
 */
export async function getContractBalance(): Promise<string> {
  if (!CLAIM_CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured');
  }

  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const contract = new ethers.Contract(
      CLAIM_CONTRACT_ADDRESS, 
      CLAIM_CONTRACT_ABI, 
      provider
    );

    const balanceInWei = await contract.getContractBalance();
    const balanceInUSDT = ethers.formatUnits(balanceInWei, 18);
    
    return balanceInUSDT;
  } catch (error) {
    console.error('Error getting contract balance:', error);
    throw error;
  }
} 
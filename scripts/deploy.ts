import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting USDTClaimContract deployment on BSC Mainnet...");

  // BSC USDT Token Address (Real USDT on BSC)
  const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "BNB");

  if (balance < ethers.parseEther("0.1")) {
    throw new Error("⚠️ Insufficient BNB balance for deployment. Need at least 0.1 BNB");
  }

  // Deploy contract
  console.log("⏳ Deploying USDTClaimContract...");
  console.log("🔗 Using USDT address:", BSC_USDT_ADDRESS);
  
  const USDTClaimContract = await ethers.getContractFactory("USDTClaimContract");
  const claimContract = await USDTClaimContract.deploy(BSC_USDT_ADDRESS);

  await claimContract.waitForDeployment();

  const contractAddress = await claimContract.getAddress();
  console.log("✅ USDTClaimContract deployed to:", contractAddress);

  // Verify USDT token address
  const usdtTokenAddress = await claimContract.usdtToken();
  console.log("🪙 USDT Token Address:", usdtTokenAddress);

  // Verify owner
  const owner = await claimContract.owner();
  console.log("👑 Contract Owner:", owner);

  // Save deployment info
  const deploymentInfo = {
    network: "BSC Mainnet",
    chainId: 56,
    claimContract: {
      address: contractAddress,
      owner: owner,
      usdtToken: usdtTokenAddress
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  // Save to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(deploymentsDir, `bsc-mainnet-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("📄 Deployment info saved to:", deploymentFile);

  console.log("\n📋 Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_CLAIM_CONTRACT_ADDRESS=${contractAddress}`);

  console.log("\n⚠️ Next steps:");
  console.log("1. Update .env.local with the new contract address");
  console.log("2. Fund the contract with USDT");
  console.log("3. Verify contract on BSCScan");
  console.log(`4. Verify command: npx hardhat verify --network bsc ${contractAddress} "${BSC_USDT_ADDRESS}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 
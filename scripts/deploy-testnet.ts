import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
  console.log("🧪 Starting BSC Testnet deployment...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "tBNB");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low tBNB balance for deployment");
    console.log("🚰 Get testnet BNB from: https://testnet.binance.org/faucet-smart");
  }

  console.log("\n" + "=".repeat(50));
  console.log("📦 Step 1: Deploying USDT Test Token...");
  console.log("=".repeat(50));

  // Deploy USDT Test Token
  const USDTTestToken = await ethers.getContractFactory("USDTTestToken");
  const usdtTestToken = await USDTTestToken.deploy();
  await usdtTestToken.waitForDeployment();

  const usdtTestTokenAddress = await usdtTestToken.getAddress();
  console.log("✅ USDTTestToken deployed to:", usdtTestTokenAddress);

  // Check initial supply
  const totalSupply = await usdtTestToken.totalSupply();
  const deployerBalance = await usdtTestToken.balanceOf(deployer.address);
  console.log("🪙 Total Supply:", ethers.formatUnits(totalSupply, 18), "USDTTest");
  console.log("💳 Deployer Balance:", ethers.formatUnits(deployerBalance, 18), "USDTTest");

  console.log("\n" + "=".repeat(50));
  console.log("📦 Step 2: Deploying USDTClaimContract...");
  console.log("=".repeat(50));

  // Deploy Claim Contract with test USDT address
  const USDTClaimContract = await ethers.getContractFactory("USDTClaimContract");
  const claimContract = await USDTClaimContract.deploy(usdtTestTokenAddress);
  await claimContract.waitForDeployment();

  const claimContractAddress = await claimContract.getAddress();
  console.log("✅ USDTClaimContract deployed to:", claimContractAddress);

  // Verify contract setup
  const contractUsdtAddress = await claimContract.usdtToken();
  const contractOwner = await claimContract.owner();
  console.log("🔗 Contract USDT Token:", contractUsdtAddress);
  console.log("👑 Contract Owner:", contractOwner);

  console.log("\n" + "=".repeat(50));
  console.log("💰 Step 3: Funding Claim Contract...");
  console.log("=".repeat(50));

  // Transfer 50,000 test USDT to claim contract for testing
  const fundAmount = ethers.parseUnits("50000", 18);
  console.log("📤 Transferring", ethers.formatUnits(fundAmount, 18), "USDTTest to claim contract...");
  
  const transferTx = await usdtTestToken.transfer(claimContractAddress, fundAmount);
  await transferTx.wait();
  
  console.log("✅ Transfer completed! TX:", transferTx.hash);

  // Verify contract balance
  const contractBalance = await usdtTestToken.balanceOf(claimContractAddress);
  console.log("💳 Claim Contract Balance:", ethers.formatUnits(contractBalance, 18), "USDTTest");

  // Save deployment info
  const deploymentInfo = {
    network: "BSC Testnet",
    chainId: 97,
    usdtTestToken: {
      address: usdtTestTokenAddress,
      name: "Tether USD Test",
      symbol: "USDTTest",
      decimals: 18,
      totalSupply: ethers.formatUnits(totalSupply, 18)
    },
    claimContract: {
      address: claimContractAddress,
      owner: contractOwner,
      usdtToken: contractUsdtAddress,
      fundedAmount: ethers.formatUnits(fundAmount, 18)
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

  const deploymentFile = path.join(deploymentsDir, `bsc-testnet-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETED!");
  console.log("=".repeat(50));
  
  console.log("📄 Deployment info saved to:", deploymentFile);
  
  console.log("\n📋 Add these to your .env.local:");
  console.log(`# BSC Testnet Addresses`);
  console.log(`USDT_TEST_TOKEN_ADDRESS=${usdtTestTokenAddress}`);
  console.log(`CLAIM_CONTRACT_ADDRESS=${claimContractAddress}`);
  console.log(`NEXT_PUBLIC_CLAIM_CONTRACT_ADDRESS=${claimContractAddress}`);

  console.log("\n🔗 Useful Links:");
  console.log(`📊 USDT Test Token: https://testnet.bscscan.com/address/${usdtTestTokenAddress}`);
  console.log(`📊 Claim Contract: https://testnet.bscscan.com/address/${claimContractAddress}`);
  console.log(`🚰 Testnet Faucet: https://testnet.binance.org/faucet-smart`);

  console.log("\n✅ Next Steps:");
  console.log("1. Update .env.local with the addresses above");
  console.log("2. Test the claim functionality");
  console.log("3. Users can get test USDT using the faucet() function");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 
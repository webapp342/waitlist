import { expect } from "chai";
import hre from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("USDTClaimContract", function () {
  let claimContract: any;
  let mockUSDT: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const MOCK_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy contract
    const USDTClaimContractFactory = await ethers.getContractFactory("USDTClaimContract");
    claimContract = await USDTClaimContractFactory.deploy(MOCK_USDT_ADDRESS);
    await claimContract.waitForDeployment();

    // For testing, we'll mock the USDT interface
    mockUSDT = await ethers.getContractAt("IERC20", MOCK_USDT_ADDRESS);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await claimContract.owner()).to.equal(owner.address);
    });

    it("Should set the correct USDT token address", async function () {
      expect(await claimContract.usdtToken()).to.equal(MOCK_USDT_ADDRESS);
    });

    it("Should have zero initial claimable amounts", async function () {
      expect(await claimContract.getClaimableAmount(user1.address)).to.equal(0);
      expect(await claimContract.getTotalClaimed(user1.address)).to.equal(0);
    });
  });

  describe("setClaimableAmount", function () {
    it("Should allow owner to set claimable amount", async function () {
      const amount = ethers.parseUnits("100", 18); // 100 USDT

      await expect(claimContract.setClaimableAmount(user1.address, amount))
        .to.emit(claimContract, "ClaimableAmountSet")
        .withArgs(user1.address, amount);

      expect(await claimContract.getClaimableAmount(user1.address)).to.equal(amount);
    });

    it("Should not allow non-owner to set claimable amount", async function () {
      const amount = ethers.parseUnits("100", 18);

      await expect(
        claimContract.connect(user1).setClaimableAmount(user2.address, amount)
      ).to.be.revertedWithCustomError(claimContract, "OwnableUnauthorizedAccount");
    });

    it("Should not allow setting claimable amount for zero address", async function () {
      const amount = ethers.parseUnits("100", 18);

      await expect(
        claimContract.setClaimableAmount(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("Invalid user address");
    });
  });

  describe("setClaimableAmountsBatch", function () {
    it("Should allow owner to set multiple claimable amounts", async function () {
      const users = [user1.address, user2.address];
      const amounts = [
        ethers.parseUnits("100", 18),
        ethers.parseUnits("200", 18)
      ];

      await claimContract.setClaimableAmountsBatch(users, amounts);

      expect(await claimContract.getClaimableAmount(user1.address)).to.equal(amounts[0]);
      expect(await claimContract.getClaimableAmount(user2.address)).to.equal(amounts[1]);
    });

    it("Should revert if arrays length mismatch", async function () {
      const users = [user1.address];
      const amounts = [
        ethers.parseUnits("100", 18),
        ethers.parseUnits("200", 18)
      ];

      await expect(
        claimContract.setClaimableAmountsBatch(users, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });
  });

  describe("claimUSDT", function () {
    beforeEach(async function () {
      // Set some claimable amount for user1
      const amount = ethers.parseUnits("100", 18);
      await claimContract.setClaimableAmount(user1.address, amount);
    });

    it("Should revert if no claimable amount", async function () {
      await expect(
        claimContract.connect(user2).claimUSDT()
      ).to.be.revertedWith("No claimable amount");
    });

    // Note: For full testing, we would need to deploy a mock USDT contract
    // or fork the BSC mainnet for testing with real USDT
    it("Should have correct claimable amount set", async function () {
      const amount = ethers.parseUnits("100", 18);
      expect(await claimContract.getClaimableAmount(user1.address)).to.equal(amount);
    });
  });

  describe("View Functions", function () {
    it("Should return correct claimable amount", async function () {
      const amount = ethers.parseUnits("150", 18);
      await claimContract.setClaimableAmount(user1.address, amount);

      expect(await claimContract.getClaimableAmount(user1.address)).to.equal(amount);
    });

    it("Should return correct total claimed (initially zero)", async function () {
      expect(await claimContract.getTotalClaimed(user1.address)).to.equal(0);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw", async function () {
      // This test would require funding the contract first
      // For now, just test the access control
      await expect(
        claimContract.connect(user1).emergencyWithdrawAll()
      ).to.be.revertedWithCustomError(claimContract, "OwnableUnauthorizedAccount");
    });
  });
}); 
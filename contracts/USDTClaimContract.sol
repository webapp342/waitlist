// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title USDTClaimContract
 * @dev Contract for users to claim their earned USDT rewards
 * Only admin can set claimable amounts based on database calculations
 */
contract USDTClaimContract is Ownable, ReentrancyGuard {
    
    // BSC USDT Token
    IERC20 public immutable usdtToken;
    
    // Mapping: user address => claimable USDT amount (in wei)
    mapping(address => uint256) public claimableAmount;
    
    // Mapping: user address => total claimed USDT amount (in wei)
    mapping(address => uint256) public totalClaimed;
    
    // Events
    event ClaimableAmountSet(address indexed user, uint256 amount);
    event USDTClaimed(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed owner, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _usdtToken BSC USDT token address
     */
    constructor(address _usdtToken) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT token address");
        usdtToken = IERC20(_usdtToken);
    }
    
    /**
     * @dev Set claimable amount for a user (only owner)
     * @param user User address
     * @param amount Claimable USDT amount in wei (18 decimals)
     */
    function setClaimableAmount(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid user address");
        claimableAmount[user] = amount;
        emit ClaimableAmountSet(user, amount);
    }
    
    /**
     * @dev Set claimable amounts for multiple users (batch operation)
     * @param users Array of user addresses
     * @param amounts Array of claimable amounts
     */
    function setClaimableAmountsBatch(
        address[] calldata users, 
        uint256[] calldata amounts
    ) external onlyOwner {
        require(users.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user address");
            claimableAmount[users[i]] = amounts[i];
            emit ClaimableAmountSet(users[i], amounts[i]);
        }
    }
    
    /**
     * @dev Claim USDT rewards
     */
    function claimUSDT() external nonReentrant {
        uint256 amount = claimableAmount[msg.sender];
        require(amount > 0, "No claimable amount");
        
        // Check contract has enough USDT balance
        uint256 contractBalance = usdtToken.balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");
        
        // Reset claimable amount
        claimableAmount[msg.sender] = 0;
        
        // Update total claimed
        totalClaimed[msg.sender] += amount;
        
        // Transfer USDT to user
        require(
            usdtToken.transfer(msg.sender, amount),
            "USDT transfer failed"
        );
        
        emit USDTClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Get claimable amount for a user
     * @param user User address
     * @return Claimable USDT amount in wei
     */
    function getClaimableAmount(address user) external view returns (uint256) {
        return claimableAmount[user];
    }
    
    /**
     * @dev Get total claimed amount for a user
     * @param user User address
     * @return Total claimed USDT amount in wei
     */
    function getTotalClaimed(address user) external view returns (uint256) {
        return totalClaimed[user];
    }
    
    /**
     * @dev Get contract USDT balance
     * @return Contract's USDT balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }
    
    /**
     * @dev Emergency withdraw USDT (only owner)
     * @param amount Amount to withdraw in wei
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 contractBalance = usdtToken.balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient balance");
        
        require(
            usdtToken.transfer(owner(), amount),
            "USDT transfer failed"
        );
        
        emit EmergencyWithdraw(owner(), amount);
    }
    
    /**
     * @dev Emergency withdraw all USDT (only owner)
     */
    function emergencyWithdrawAll() external onlyOwner {
        uint256 contractBalance = usdtToken.balanceOf(address(this));
        require(contractBalance > 0, "No balance to withdraw");
        
        require(
            usdtToken.transfer(owner(), contractBalance),
            "USDT transfer failed"
        );
        
        emit EmergencyWithdraw(owner(), contractBalance);
    }
} 
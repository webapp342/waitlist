// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title USDTTestToken
 * @dev Test USDT token for BSC Testnet
 */
contract USDTTestToken is ERC20, Ownable {
    
    uint8 private _decimals = 18;
    
    constructor() ERC20("Tether USD Test", "USDTTest") Ownable(msg.sender) {
        // Mint 1 million test USDT to deployer
        _mint(msg.sender, 1000000 * 10**_decimals);
    }
    
    /**
     * @dev Mint new tokens (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Get decimals (override to ensure 18 decimals)
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Faucet function - anyone can get 1000 test USDT (for testing)
     */
    function faucet() external {
        require(balanceOf(msg.sender) < 10000 * 10**_decimals, "Already have enough test tokens");
        _mint(msg.sender, 1000 * 10**_decimals);
    }
} 
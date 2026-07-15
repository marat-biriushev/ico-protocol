// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleICO is Ownable {
    // IERC20 
    // transfer/balanceOf"
    IERC20 public immutable token;

    // Сколько токенов даём за 1 wei. При rate = 1000 покупатель
    // за 1 ETH получит 1000 токенов (см. раздел про decimals ниже)
    uint256 public immutable rate;

    uint256 public immutable startTime;
    uint256 public immutable endTime;

    // totall ETH collected
    uint256 public totalRaised;

    event TokensPurchased(address indexed buyer, uint256 ethSpent, uint256 tokensBought);

    constructor(
        address _token,
        uint256 _rate,
        uint256 _startTime,
        uint256 _endTime
    ) Ownable(msg.sender) {
        require(_startTime < _endTime, "start must be before end");
        require(_rate > 0, "rate must be positive");
        token = IERC20(_token);
        rate = _rate;
        startTime = _startTime;
        endTime = _endTime;
    }

    //4 Users should be able to purchase tokens by sending ETH to the contract.
    receive() external payable {
        buyTokens();
    }

    function buyTokens() public payable {
        require(block.timestamp >= startTime, "ICO has not started yet");
        require(block.timestamp <= endTime, "ICO has already ended");
        require(msg.value > 0, "send ETH to buy tokens");

        uint256 tokenAmount = msg.value * rate;
        require(
            token.balanceOf(address(this)) >= tokenAmount,
            "not enough tokens left for sale"
        );

        totalRaised += msg.value;
        token.transfer(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    // 7. The contract owner must be able to withdraw the collected ETH after the ICO has ended.
    function withdraw() external onlyOwner {
        require(block.timestamp > endTime, "ICO is still active");
        (bool ok, ) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "ETH transfer failed");
    }
}
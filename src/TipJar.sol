// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Ownable } from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract TipJar is Ownable {

    constructor() Ownable(msg.sender) {}

    error EmptyTip();

    event NewTip(address indexed from, uint amount, string message);
    event Withdrawn(address indexed to, uint amount);

    struct Tip {
        address from;
        string message;
        uint tipAmount;
    }

    Tip[] tips;

    function addTip(string memory _message) external payable {
        if (msg.value == 0) revert EmptyTip();
        tips.push(Tip(msg.sender, _message, msg.value));
        emit NewTip(msg.sender, msg.value, _message);
    }

    function getTips() external view returns (Tip[] memory) {
        return tips;
    }

    function withdraw() external onlyOwner {
        uint ammount = address(this).balance;
        (bool ok,) = owner().call{value: ammount}("");
        require(ok, "transfer failed");
        emit Withdrawn(owner(), ammount);
    }


}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract TipJar {
    struct Tip {
        address from;
        string message;
        uint tipAmount;
    }

    Tip[] tips;

    function addTip(string memory _message) external payable {
        require(msg.value > 0);
        tips.push(Tip(msg.sender, _message, msg.value));
    }

    function getTips() external view returns (Tip[] memory) {
        return tips;
    }


}

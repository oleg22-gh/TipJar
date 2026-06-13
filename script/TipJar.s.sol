// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {TipJar} from "../src/TipJar.sol";

contract TipJarScript is Script {
    TipJar public tipJar;

    function run() public {
        vm.startBroadcast();

        tipJar = new TipJar();
        console.log("TipJar deployed at:", address(tipJar));

        vm.stopBroadcast();
    }
}

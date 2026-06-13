// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";

contract TipJarTest is Test {
    TipJar public tipJar;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        tipJar = new TipJar();
    }

    function test_AddTip() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        tipJar.addTip{value: 1 ether}("thanks!");

        TipJar.Tip[] memory tips = tipJar.getTips();
        assertEq(tips.length, 1);
        assertEq(tips[0].from, alice);
        assertEq(tips[0].message, "thanks!");
        assertEq(tips[0].tipAmount, 1 ether);
        assertEq(address(tipJar).balance, 1 ether);
    }

    function test_AddMultipleTips() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 2 ether);

        vm.prank(alice);
        tipJar.addTip{value: 0.5 ether}("from alice");
        vm.prank(bob);
        tipJar.addTip{value: 1.5 ether}("from bob");

        TipJar.Tip[] memory tips = tipJar.getTips();
        assertEq(tips.length, 2);

        assertEq(tips[0].from, alice);
        assertEq(tips[0].message, "from alice");
        assertEq(tips[0].tipAmount, 0.5 ether);

        assertEq(tips[1].from, bob);
        assertEq(tips[1].message, "from bob");
        assertEq(tips[1].tipAmount, 1.5 ether);

        assertEq(address(tipJar).balance, 2 ether);
    }

    function test_RevertWhen_TipIsZero() public {
        vm.prank(alice);
        vm.expectRevert();
        tipJar.addTip("no money");
    }

    function test_GetTipsEmptyInitially() public view {
        TipJar.Tip[] memory tips = tipJar.getTips();
        assertEq(tips.length, 0);
    }

    function testFuzz_AddTip(uint96 amount, string calldata message) public {
        vm.assume(amount > 0);
        vm.deal(alice, amount);

        vm.prank(alice);
        tipJar.addTip{value: amount}(message);

        TipJar.Tip[] memory tips = tipJar.getTips();
        assertEq(tips.length, 1);
        assertEq(tips[0].from, alice);
        assertEq(tips[0].message, message);
        assertEq(tips[0].tipAmount, amount);
    }
}

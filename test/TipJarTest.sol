// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";

contract TipJarTest is Test {
    TipJar public tipJar;

    address owner = makeAddr("owner");
    address stranger = makeAddr("stranger");

    function setUp() public {
        vm.prank(owner);
        tipJar = new TipJar();
    }

    function test_OwnerIsDeployer() public view {
        assertEq(tipJar.owner(), owner);
    }

    function test_AddTip() public {
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        tipJar.addTip{value: 1 ether}("thanks!");

        TipJar.Tip[] memory tips = tipJar.getTips();
        assertEq(tips.length, 1);
        assertEq(tips[0].from, owner);
        assertEq(tips[0].message, "thanks!");
        assertEq(tips[0].tipAmount, 1 ether);
        assertEq(address(tipJar).balance, 1 ether);
    }

    function test_AnyoneCanAddTip() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        tipJar.addTip{value: 1 ether}("from a stranger");

        TipJar.Tip[] memory tips = tipJar.getTips();
        assertEq(tips.length, 1);
        assertEq(tips[0].from, stranger);
        assertEq(address(tipJar).balance, 1 ether);
    }

    function test_RevertWhen_TipIsZero() public {
        vm.prank(owner);
        vm.expectRevert();
        tipJar.addTip("no money");
    }

    function test_Withdraw() public {
        vm.deal(owner, 5 ether);
        vm.prank(owner);
        tipJar.addTip{value: 3 ether}("hi");

        assertEq(address(tipJar).balance, 3 ether);
        uint ownerBalanceBefore = owner.balance; // 2 ether left after tipping

        vm.prank(owner);
        tipJar.withdraw();

        assertEq(address(tipJar).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + 3 ether);
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        tipJar.addTip{value: 1 ether}("hi");

        vm.prank(stranger);
        vm.expectRevert();
        tipJar.withdraw();
    }

    function test_WithdrawZeroBalance() public {
        uint ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        tipJar.withdraw();

        assertEq(address(tipJar).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore);
    }

    function testFuzz_Withdraw(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(owner, amount);

        vm.prank(owner);
        tipJar.addTip{value: amount}("fuzz");
        assertEq(address(tipJar).balance, amount);

        vm.prank(owner);
        tipJar.withdraw();

        assertEq(address(tipJar).balance, 0);
        assertEq(owner.balance, amount);
    }
}

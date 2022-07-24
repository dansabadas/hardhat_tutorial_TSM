// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract WorkContract {
    address public owner;

    constructor() {
        owner = msg.sender;
    }
}

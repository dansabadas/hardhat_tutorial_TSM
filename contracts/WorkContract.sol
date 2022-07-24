// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract WorkContract {
    struct Stream
    {
        address recipient;
        address sender;
        uint256 deposit;
        uint256 startTime;
        uint256 stopTime;
        uint256 rate;
        uint256 balance;
    }

    mapping(uint32 => Stream) private streams;
    uint32  public streamIdCounter;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function createStream(address _recipient, uint256 _startTime, uint256 _stopTime) public payable
    {
        require(_recipient != address(this), "Stream to the contract itself");
        require(_recipient != msg.sender, "Stream to the caller");
        require(msg.value > 0, "Deposit is equal to zero");
        require(_startTime >= block.timestamp, "Start time before block timestamp");
        require(_startTime < _stopTime, "Start time after stop time");

        uint256 l_duration = _stopTime - _startTime;
        uint256 l_deposit =  msg.value;

        require(l_deposit >= l_duration, "Deposit smaller than duration");

        streamIdCounter += 1;
        uint32 l_currentStreamId = streamIdCounter;

        // Rate Per second
        uint256 l_rate = l_deposit / l_duration;
        uint256 l_finalAmount = l_deposit - l_deposit % l_duration;

        streams[l_currentStreamId] = Stream({
            balance: l_finalAmount,
            deposit: l_finalAmount,
            rate: l_rate,
            recipient: _recipient,
            sender: msg.sender,
            startTime: _startTime,
            stopTime: _stopTime
        });

        (bool success,) = msg.sender.call{value: (l_deposit - l_finalAmount)}("");
        if (!success) revert ("Funds transfer reverted");
    }
}

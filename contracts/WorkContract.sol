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

    event CreateStream(
        uint32  indexed _streamId,
        address indexed _sender,
        address indexed _recipient
    );

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

        emit CreateStream(
            l_currentStreamId,
            msg.sender,
            _recipient
        );
    }

    function balanceOf(uint32 _streamId, address _who)
        external view returns (uint256)
    {
        Stream memory l_stream_ = streams[_streamId];
        uint256 l_elapsedTime;

        if (block.timestamp > l_stream_.startTime) {
            l_elapsedTime = l_stream_.stopTime;
            if (block.timestamp < l_stream_.stopTime) {
                 l_elapsedTime = uint32(block.timestamp);
            }

            unchecked {
                l_elapsedTime -= l_stream_.startTime;
            }
        }

        uint256 l_amountWithdrawn;
        unchecked {
            l_amountWithdrawn = l_stream_.deposit - l_stream_.balance;
        }

        uint256 l_due;
        unchecked {
            l_due = l_elapsedTime * l_stream_.rate - l_amountWithdrawn;
        }

        if (_who == l_stream_.recipient) return l_due;

        if (_who == l_stream_.sender) {
            unchecked {
                return l_stream_.balance - l_due;
            }
        }

        return 0;
    }
}

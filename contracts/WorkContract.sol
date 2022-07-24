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
        public view returns (uint256)
    {
        Stream memory l_stream = streams[_streamId];
        uint256 l_elapsedTime;

        if (block.timestamp > l_stream.startTime) {
            l_elapsedTime = l_stream.stopTime;
            if (block.timestamp < l_stream.stopTime) {
                 l_elapsedTime = uint32(block.timestamp);
            }

            unchecked {
                l_elapsedTime -= l_stream.startTime;
            }
        }

        uint256 l_amountWithdrawn;
        unchecked {
            l_amountWithdrawn = l_stream.deposit - l_stream.balance;
        }

        uint256 l_due;
        unchecked {
            l_due = l_elapsedTime * l_stream.rate - l_amountWithdrawn;
        }

        if (_who == l_stream.recipient) return l_due;

        if (_who == l_stream.sender) {
            unchecked {
                return l_stream.balance - l_due;
            }
        }

        return 0;
    }

    event WithdrawFromStream(
        uint32  indexed _streamId,
        address indexed _sender,
        address indexed _recipient
    );
    function withdrawFromStream(uint32 _streamId) external
    {
        Stream memory l_stream = streams[_streamId];

        require(
            l_stream.recipient != address(0) && l_stream.sender != address(0),
           "Stream does not exist"
        );

        require(
            msg.sender == l_stream.recipient,
           "Caller is not the recipient of the stream"
        );

        uint256 balance_ = balanceOf(_streamId, l_stream.recipient);

        require(balance_ > 0, "Available balance is 0");

        unchecked { l_stream.balance -= balance_; }

        streams[_streamId] = l_stream;

        emit WithdrawFromStream(_streamId, l_stream.sender, l_stream.recipient);
        (bool success,) = l_stream.recipient.call{value: balance_}("");
        if (!success) revert("Funds transfer reverted");
    }

    event CancelStream(
        uint32  indexed _streamId,
        address indexed _sender,
        address indexed _recipient);
    function cancelStream(uint32 _streamId) external
    {
        Stream memory l_stream = streams[_streamId];

        require(
            l_stream.recipient != address(0) && l_stream.sender != address(0),
           "Stream does not exist"
        );

        require(
            msg.sender == l_stream.recipient || msg.sender == l_stream.sender,
           "Caller is not the sender or the recipient of the stream"
        );

        uint256 l_balance = balanceOf(_streamId, l_stream.recipient);

        delete streams[_streamId];

        emit CancelStream(_streamId, l_stream.sender, l_stream.recipient);

        if (l_balance > 0) {
            (bool success2,) = l_stream.recipient.call{value: l_balance}("");
            if (!success2) revert("Funds transfer reverted");
        }

        (bool success,) = l_stream.sender.call{value: (l_stream.balance - l_balance)}("");
        if (!success) revert("Funds transfer reverted");
    }
}

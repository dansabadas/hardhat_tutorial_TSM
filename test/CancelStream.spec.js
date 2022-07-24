const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("Cancel stream", () => {

    let streamingContract;
    let owner;
    let sender;
    let recipient;
    let startTimestamp;
    let stopTimestamp;

    let deposit = ethers.utils.parseEther("1");
    let streamIdCounter;

    beforeEach("#deploy", async () => {
        [ owner, sender, recipient ] = await ethers.getSigners();

        let workContractFactory = await ethers.getContractFactory("WorkContract");
        streamingContract = await workContractFactory.deploy();
        await streamingContract.deployed();
    });

    beforeEach("#setup", async function () {
        const delay = 100;
        const duration = 100;

        now = (await ethers.provider.getBlock()).timestamp;
        startTimestamp = now + delay;
        stopTimestamp = startTimestamp + duration;

        rate = deposit.div(stopTimestamp - startTimestamp);

        await streamingContract.connect(sender).createStream(
            recipient.address,
            startTimestamp,
            stopTimestamp,
            { value: deposit }
        );
        streamIdCounter = await streamingContract.streamIdCounter();
    });

    describe("#reverts", function () {

        it("should revert when stream doesn't exist", async function () {
            let invalidStreamId = 3;
            await expect(
                streamingContract.connect(recipient).cancelStream(invalidStreamId)
            ).to.be.revertedWith("Stream does not exist");
        });

        it("should revert when msg.sender is not stream sender or recipient",
            async function () {
            await expect(
                streamingContract.connect(owner).cancelStream(1)
            ).to.be.revertedWith("Caller is not the sender or the recipient of the stream");
        });

        it("should revert when stream is already canceled", async function () {
            expect(
                await streamingContract.connect(recipient).cancelStream(streamIdCounter)
            ).to.not.throw;

            await expect(
                streamingContract.connect(recipient).cancelStream(streamIdCounter)
            ).to.be.revertedWith("Stream does not exist");
        });
    });

    describe("#success", function () {
        const setTime = async (provider, timestamp) => {
            await provider.send("evm_mine", [timestamp]);
        }
        it("should send accumulated balance to recipient and leftover to sender", async function () {
            const recipientBalance0 = await recipient.getBalance();
            const senderBalance0 = await sender.getBalance();

            const amount = deposit.div(100).mul(2);

            await setTime(ethers.provider, startTimestamp);

            let transactions = [
                await streamingContract.connect(recipient).withdrawFromStream(streamIdCounter),
                await streamingContract.connect(recipient).cancelStream(streamIdCounter)
            ];

            const receipts = [
                await transactions[0].wait(),
                await transactions[1].wait()
            ];

            const gasUsed = [
                receipts[0].gasUsed.mul(transactions[0].gasPrice),
                receipts[1].gasUsed.mul(transactions[1].gasPrice)
            ];

            const recipientBalance1 = await recipient.getBalance();

            expect(
                recipientBalance0.sub(gasUsed[0]).sub(gasUsed[1]).add(amount)
            ).to.be.equal(recipientBalance1);

            const senderBalance1 = await sender.getBalance();

            expect(
                senderBalance0.add(deposit).sub(amount)
            ).to.be.equal(senderBalance1);
        });
    });
});
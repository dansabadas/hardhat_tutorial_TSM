const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("Withdraw from stream", () => {

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
        const setTime = async (provider, timestamp) => {
            await provider.send("evm_mine", [timestamp]);
        }
        it("should revert when stream doesn't exist", async function () {
            let invalidStreamId = 3;
            await expect(
                streamingContract.connect(sender).withdrawFromStream(invalidStreamId)
            ).to.be.revertedWith("Stream does not exist");
        });
        it("should revert when msg.sender is not stream recipient", async function () {
            await expect(
                streamingContract.connect(owner).withdrawFromStream(streamIdCounter)
            ).to.be.revertedWith("Caller is not the recipient of the stream");
        });
        it("should revert when stream stop time passed and deposit was withdrawn entirely", async function () {
            await setTime(ethers.provider, stopTimestamp + 1);

            expect(
                await streamingContract.connect(recipient)
                    .withdrawFromStream(streamIdCounter)
            ).to.not.throw;

            await expect(
                streamingContract.connect(recipient)
                    .withdrawFromStream(streamIdCounter)
            ).to.be.revertedWith("Available balance is 0");
        });
    });
    describe("#success", function () {
        const setTime = async (provider, timestamp) => {
            await provider.send("evm_mine", [timestamp]);
        }
        it("should emit the WithdrawFromStream event", async function () {
            let timeToSet = stopTimestamp + 1;
            await setTime(ethers.provider, timeToSet);

            await expect(
                streamingContract.connect(recipient).withdrawFromStream(1)
            ).to.emit(streamingContract, "WithdrawFromStream")
                .withArgs(streamIdCounter, sender.address, recipient.address);
        });
    });
});
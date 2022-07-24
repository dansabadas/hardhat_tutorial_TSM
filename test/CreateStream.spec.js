const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Create Stream", () => {
    let streamingContract;
    let owner;
    let sender;
    let recipient;
    let startTimestamp;
    let stopTimestamp;

    let deposit = ethers.utils.parseEther("1");
    let now;

    beforeEach("#deploy", async () => {
        [ owner, sender, recipient ] = await ethers.getSigners();

        let workContractFactory = await ethers.getContractFactory("WorkContract");
        streamingContract = await workContractFactory.deploy();
        await streamingContract.deployed();

        const delay = 100;
        const duration = 101;

        now = (await ethers.provider.getBlock()).timestamp;
        startTimestamp = now + delay;
        stopTimestamp = startTimestamp + duration;
    });

    describe("#reverts", function () {
        it("should revert when recipient address is the contract itself", async function () {
            await expect(
                streamingContract.connect(sender).createStream(
                    streamingContract.address,
                    startTimestamp,
                    stopTimestamp,
                    { value: deposit }
                )
            ).to.be.revertedWith("Stream to the contract itself");
        });

        it("should revert when sender and recipient are same", async function () {
            await expect(
                streamingContract.connect(sender).createStream(
                    sender.address,
                    startTimestamp,
                    stopTimestamp,
                    { value: deposit }
                )
            ).to.be.revertedWith("Stream to the caller");
        });
    });

    describe("#success", function () {
        it("should increase the id counter", async function () {
            let streamIdCounter = await streamingContract.streamIdCounter();
            expect(streamIdCounter).to.be.equal(0);

            expect(
                await streamingContract.connect(sender).createStream(
                    recipient.address,
                    startTimestamp,
                    stopTimestamp,
                    { value: deposit })
            ).to.not.throw;

            streamIdCounter = await streamingContract.streamIdCounter();
            expect(streamIdCounter).to.be.equal(1);
        });

        it("should emit CreateStream event", async function () {
            await expect(
                streamingContract.connect(sender).createStream(
                    recipient.address,
                    startTimestamp,
                    stopTimestamp,
                    { value: deposit })
            ).to.emit(streamingContract, "CreateStream")
                .withArgs(
                    1,
                    sender.address,
                    recipient.address
                );
        });

        it("should increase the contract balance by deposit amount", async function () {
            let balance = await ethers.provider.getBalance(streamingContract.address);
            expect(balance).to.be.equal(0);

            expect(
                await streamingContract.connect(sender).createStream(
                    recipient.address,
                    startTimestamp,
                    stopTimestamp,
                    { value: deposit })
            ).to.not.throw;

            balance = await ethers.provider.getBalance(streamingContract.address);
            let remainder = deposit.mod(stopTimestamp - startTimestamp);
            expect(balance).to.be.equal(deposit.sub(remainder));
        });
    });
});
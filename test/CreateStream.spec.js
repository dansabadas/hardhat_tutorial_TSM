const { expect, assert } = require("chai");
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
        const duration = 100;

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
});
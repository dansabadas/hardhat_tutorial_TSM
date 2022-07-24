const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("Balance of stream", () => {
    let streamingContract;
    let owner;
    let sender;
    let recipient;
    let startTimestamp;
    let stopTimestamp;
    let rate;
    let streamIdCounter;
    let deposit = ethers.utils.parseEther("1");

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

    describe("#success", function () {
        const setTime = async (provider, timestamp) => {
            await provider.send("evm_mine", [timestamp]);
        }

        it("should return 0 balance for address not involved in stream", async function () {
            const otherPartyBalance = await streamingContract.connect(sender).balanceOf(streamIdCounter, owner.address);
            expect(otherPartyBalance).to.be.equal(0);
        });

        it("should return 0 balance when timestamp is before stream start time", async function () {
            let recipientContractBalance = await streamingContract.connect(sender).balanceOf(streamIdCounter, recipient.address);
            expect(recipientContractBalance).to.be.equal(0);
        });

        it("should return correct balance for recipient during stream time", async function () {
            const rates = [ 1, 10, 25, 66 ];

            for (r of rates) {
                await setTime(ethers.provider, startTimestamp + r);
                recipientContractBalance = await streamingContract.connect(sender).balanceOf(streamIdCounter, recipient.address);
                expect(recipientContractBalance).to.be.equal(rate.mul(r));
            }
        });

        it("should return deposit value when stream stop time passed", async function () {
            await setTime(ethers.provider, stopTimestamp + 1);
            recipientContractBalance = await streamingContract.connect(sender).balanceOf(streamIdCounter, recipient.address);
            expect(recipientContractBalance).to.be.equal(deposit);
        });

        it("should return correct balance after withdrawal after one second", async function () {
            await setTime(ethers.provider, startTimestamp + 1);

            let recipientContractBalance = await streamingContract.connect(sender).balanceOf(1, recipient.address);
            expect(recipientContractBalance).to.be.equal(rate);
        });
    });
});
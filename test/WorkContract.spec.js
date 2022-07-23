const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("Deployment", () => {

    let testSigner, workContract;

    beforeEach("#deploy", async () => {
        let workContractFactory = await ethers.getContractFactory("WorkContract");
        [testSigner] = await ethers.getSigners();

        workContract = await workContractFactory.deploy();

        await workContract.deployed();
    });

    describe("#success", function () {

        describe("Deployment", function () {
            it("Should set the right owner", async function () {
                expect(await workContract.owner()).to.equal(testSigner.address);
            });
        });
    });
});
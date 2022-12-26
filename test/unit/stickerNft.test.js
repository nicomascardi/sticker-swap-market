const { assert, expect } = require("chai");
const { deployments, ethers, network } = require("hardhat");
const { networkConfig } = require("../../helper-hardhat-config");

describe("StickerNft tests", function () {
    let deployer, someoneElse, stickerNft, mintFee;
    const chainId = network.config.chainId;
    beforeEach(async function () {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        someoneElse = accounts[1];
        await deployments.fixture(["all"]);
        stickerNft = await ethers.getContract("StickerNft");
        mintFee = networkConfig[chainId].mintFee;
    });

    describe("constructor", function () {
        it("initialize correctly", async function () {
            assert.equal(await stickerNft.getTokenCounter(), 1);
            assert.equal(await stickerNft.getMintFee(), mintFee.toString());
        });
    });

    describe("updateMintFee", function () {
        const newMintFee = ethers.utils.parseEther("0.02");

        it("updateMintFee correctly", async function () {
            await stickerNft.updateMintFee(newMintFee);
            assert.equal(await stickerNft.getMintFee(), newMintFee.toString());
        });

        it("notOwner", async function () {
            const someoneElseConnectedStickerNft = stickerNft.connect(someoneElse);
            await expect(
                someoneElseConnectedStickerNft.updateMintFee(newMintFee)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("buySticker", function () {
        it("not enough ETH", async function () {
            await expect(stickerNft.buySticker({ value: 0 })).to.be.revertedWith(
                "StickerNft__NotEnoughETH"
            );
        });

        it("sticker bought correctly", async function () {
            const tx = await stickerNft.buySticker({ value: mintFee });
            const txReceipt = await tx.wait(1);
            const { tokenId, stickerId, minter } = txReceipt.events[1].args;
            const tokenUri = await stickerNft.getTokenUri(stickerId);
            assert.equal(await stickerNft.getTokenCounter(), 2);
            assert.equal(tokenId.toString(), "1");
            assert.equal(minter, deployer.address);
            assert.isTrue(tokenUri.startsWith("ipfs://"));
        });
    });

    describe("getTokenUri", function () {
        it("getTokenUri correctly", async function () {
            assert.isTrue((await stickerNft.getTokenUri(1)).startsWith("ipfs://"));
        });
    });
});

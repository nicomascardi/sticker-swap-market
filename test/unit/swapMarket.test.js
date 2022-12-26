const { assert, expect } = require("chai");
const { deployments, ethers, network } = require("hardhat");
const { networkConfig } = require("../../helper-hardhat-config");

describe("SwapMarket tests", function () {
    let deployer,
        someoneElse,
        swapMarket,
        itemNft,
        someoneElseSwapMarket,
        someoneElseItemNft,
        mintFee,
        reqTokenId,
        offerTokenId;
    const chainId = network.config.chainId;
    beforeEach(async function () {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        someoneElse = accounts[1];
        await deployments.fixture(["all"]);
        swapMarket = await ethers.getContract("SwapMarket");
        someoneElseSwapMarket = swapMarket.connect(someoneElse);
        itemNft = await ethers.getContract("StickerNft");
        someoneElseItemNft = itemNft.connect(someoneElse);

        mintFee = networkConfig[chainId].mintFee;

        const txReqItem = await itemNft.buySticker({ value: mintFee });
        const txReqItemReceipt = await txReqItem.wait(1);
        ({ tokenId: reqTokenId } = txReqItemReceipt.events[1].args);
        await itemNft.approve(swapMarket.address, reqTokenId);

        const txOfferItem = await someoneElseItemNft.buySticker({ value: mintFee });
        const txOfferItemReceipt = await txOfferItem.wait(1);
        ({ tokenId: offerTokenId } = txOfferItemReceipt.events[1].args);
        await someoneElseItemNft.approve(swapMarket.address, offerTokenId);
    });

    describe("addRequest", function () {
        it("notOwner", async function () {
            await expect(
                someoneElseSwapMarket.addRequest(itemNft.address, reqTokenId)
            ).to.be.revertedWith("SwapMarket__NotOwner");
        });

        it("requestAlreadyExists", async function () {
            await swapMarket.addRequest(itemNft.address, reqTokenId);

            await expect(swapMarket.addRequest(itemNft.address, reqTokenId)).to.be.revertedWith(
                "SwapMarket_RequestAlreadyExists"
            );
        });

        it("add request correctly", async function () {
            const tx = await swapMarket.addRequest(itemNft.address, reqTokenId);
            const txReceipt = await tx.wait(1);
            const {
                nftAddress: evtNftAddress,
                tokenId: evtTokenId,
                swapper: evtSwapper,
            } = txReceipt.events[0].args;
            const swapRequest = await swapMarket.getSwapRequest(itemNft.address, reqTokenId);

            assert.equal(swapRequest.owner, deployer.address);
            assert.equal(evtNftAddress, itemNft.address);
            assert.equal(evtTokenId.toString(), reqTokenId.toString());
            assert.equal(evtSwapper.toString(), deployer.address.toString());
        });

        it("token not approved", async function () {
            const tx = await itemNft.buySticker({ value: mintFee });
            const txReceipt = await tx.wait(1);
            const { tokenId: evtTokenId } = txReceipt.events[0].args;
            await expect(swapMarket.addRequest(itemNft.address, evtTokenId)).to.be.revertedWith(
                "SwapMarket__NotApproved"
            );
        });
    });

    describe("removeRequest", function () {
        it("notOwner", async function () {
            const someoneElseSwapMarket = swapMarket.connect(someoneElse);
            await expect(
                someoneElseSwapMarket.removeRequest(itemNft.address, reqTokenId)
            ).to.be.revertedWith("SwapMarket__NotOwner");
        });

        it("requestNotExists", async function () {
            await expect(swapMarket.removeRequest(itemNft.address, reqTokenId)).to.be.revertedWith(
                "SwapMarket_RequestNotExists"
            );
        });

        it("remove request correctly", async function () {
            await swapMarket.addRequest(itemNft.address, reqTokenId);

            const tx = await swapMarket.removeRequest(itemNft.address, reqTokenId);
            const txReceipt = await tx.wait(1);
            const {
                nftAddress: evtNftAddress,
                tokenId: evtTokenId,
                swapper: evtSwapper,
            } = txReceipt.events[0].args;
            const swapRequest = await swapMarket.getSwapRequest(itemNft.address, reqTokenId);

            assert.equal(swapRequest.owner, ethers.constants.AddressZero);
            assert.equal(evtNftAddress, itemNft.address);
            assert.equal(evtTokenId.toString(), reqTokenId.toString());
            assert.equal(evtSwapper.toString(), deployer.address.toString());
        });

        it("remove request with offers correctly", async function () {
            await swapMarket.addRequest(itemNft.address, reqTokenId);
            await someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId);

            await expect(swapMarket.removeRequest(itemNft.address, reqTokenId)).to.emit(
                swapMarket,
                "SwapMarket_OfferRemoved"
            );
            const swapRequest = await swapMarket.getSwapRequest(itemNft.address, reqTokenId);

            assert.equal(swapRequest.owner, ethers.constants.AddressZero);
        });
    });

    describe("addOffer", function () {
        it("notOwner", async function () {
            await expect(
                swapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId)
            ).to.be.revertedWith("SwapMarket__NotOwner");
        });

        it("requestNotExists", async function () {
            await expect(
                someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId)
            ).to.be.revertedWith("SwapMarket_RequestNotExists");
        });

        it("offerAlreadyExists", async function () {
            await swapMarket.addRequest(itemNft.address, reqTokenId);

            await someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId);

            await expect(
                someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId)
            ).to.be.revertedWith("SwapMarket_OfferAlreadyExists");
        });

        it("token not approved", async function () {
            const tx = await someoneElseItemNft.buySticker({ value: mintFee });
            const txReceipt = await tx.wait(1);
            const { tokenId: evtTokenId } = txReceipt.events[0].args;

            await swapMarket.addRequest(itemNft.address, reqTokenId);

            await expect(
                someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, evtTokenId)
            ).to.be.revertedWith("SwapMarket__NotApproved");
        });

        it("add offer correctly", async function () {
            await swapMarket.addRequest(itemNft.address, reqTokenId);

            await someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId);

            assert.equal(
                (
                    await someoneElseSwapMarket.getSwapOffer(itemNft.address, offerTokenId)
                ).toString(),
                reqTokenId.toString()
            );
        });
    });

    describe("removeOffer", function () {
        it("notOwner", async function () {
            await expect(swapMarket.removeOffer(itemNft.address, offerTokenId)).to.be.revertedWith(
                "SwapMarket__NotOwner"
            );
        });

        it("offerNotExists", async function () {
            await expect(
                someoneElseSwapMarket.removeOffer(itemNft.address, offerTokenId)
            ).to.be.revertedWith("SwapMarket_OfferNotExists");
        });

        it("remove offer correctly", async function () {
            await swapMarket.addRequest(itemNft.address, reqTokenId);
            await someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId);
            await someoneElseSwapMarket.removeOffer(itemNft.address, offerTokenId);
            assert.equal(
                (
                    await someoneElseSwapMarket.getSwapOffer(itemNft.address, offerTokenId)
                ).toString(),
                "0"
            );
        });
    });

    describe("swapItem", function () {
        it("swap correctly", async function () {
            await swapMarket.addRequest(itemNft.address, reqTokenId);

            await someoneElseSwapMarket.addOffer(itemNft.address, reqTokenId, offerTokenId);

            assert.equal(
                (await itemNft.ownerOf(reqTokenId)).toString(),
                deployer.address.toString()
            );

            assert.equal(
                (await itemNft.ownerOf(offerTokenId)).toString(),
                someoneElse.address.toString()
            );

            const swapTx = await swapMarket.swapItem(itemNft.address, reqTokenId, offerTokenId);
            const swapTxReceipt = await swapTx.wait(1);
            assert.equal(swapTxReceipt.events.length, 4);

            assert.equal(
                (await itemNft.ownerOf(reqTokenId)).toString(),
                someoneElse.address.toString()
            );

            assert.equal(
                (await itemNft.ownerOf(offerTokenId)).toString(),
                deployer.address.toString()
            );
        });
    });
});

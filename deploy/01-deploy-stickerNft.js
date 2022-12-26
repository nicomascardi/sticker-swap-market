const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let tokenUris = ["ipfs://messi", "ipfs://dimaria", "ipfs://dibu"];

    const args = [networkConfig[chainId].mintFee, tokenUris];
    const stickerNft = await deploy("StickerNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(stickerNft.address, args);
    }
};

module.exports.tags = ["all", "stickernft"];

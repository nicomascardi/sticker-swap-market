// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error StickerNft__NotEnoughETH();
error StickerNft__NotEnoughETH__TransferFailed();

contract StickerNft is ERC721URIStorage, Ownable {
    uint256 internal s_tokenCounter;
    uint256 internal s_mintFee;
    string[] internal i_stickerTokenUris;

    event StickerNftMinted(uint256 indexed tokenId, uint256 indexed stickerId, address minter);

    constructor(
        uint256 _mintFee,
        string[] memory _stickerTokenUris
    ) ERC721("Sticker Nft", "STICKER") {
        s_tokenCounter = 1;
        s_mintFee = _mintFee;
        i_stickerTokenUris = _stickerTokenUris;
    }

    function updateMintFee(uint _newFee) external onlyOwner {
        s_mintFee = _newFee;
    }

    function buySticker() external payable returns (uint256) {
        if (msg.value < s_mintFee) {
            revert StickerNft__NotEnoughETH();
        }
        uint tokenId = s_tokenCounter;
        s_tokenCounter++;
        uint256 stickerId = getRandomStickerId();
        string memory tokenUri = i_stickerTokenUris[stickerId];
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenUri);
        emit StickerNftMinted(tokenId, stickerId, msg.sender);
        return tokenId;
    }

    function getRandomStickerId() private view returns (uint256) {
        return
            uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) %
            i_stickerTokenUris.length;
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert StickerNft__NotEnoughETH__TransferFailed();
        }
    }

    function getTokenCounter() external view returns (uint256) {
        return s_tokenCounter;
    }

    function getMintFee() external view returns (uint256) {
        return s_mintFee;
    }

    function getTokenUri(uint256 _index) external view returns (string memory) {
        return i_stickerTokenUris[_index];
    }
}

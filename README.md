# Sticker Album Swap Market
A DApp for buying and swapping stickers. 
Similar to a real Sticker Album, when a user buys a sticker, a random NFT (from a given list of stickers) will be selected and transfer to the user.
Then, users can swap stickers each other (e.g. repeated stickers):
* A user creates a swap requests for a given sticker
* Swap requests can be seen by other users who can offer a sticker to swap with.
* The user who created the request can then select one of the offered stickers and confirm the swap.


Note: This project was built with the purpose of learning solidity and ethereum blockchain development

## Stack used:

* Solidity https://soliditylang.org/
* Hardhat https://hardhat.org/
* Ethers https://docs.ethers.org/v5/
* Chai https://www.chaijs.com/
* Ipfs https://ipfs.tech/
* ChainLink https://chain.link/
* OpenZeppelin https://www.openzeppelin.com/

## To Do

* Create NFT metadata using stickers.json as reference and upload to Ipfs
* Add NFTs to deploy process
* Deploy to testnet (add staging tests)
* Increase unit tests coverage
* Replace pseudo random NFT generation by ChainLink VRF
* Implement the frontend!!!

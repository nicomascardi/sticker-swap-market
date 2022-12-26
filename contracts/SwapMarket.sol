// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error SwapMarket__NotOwner();
error SwapMarket_RequestAlreadyExists();
error SwapMarket_RequestNotExists();
error SwapMarket_OfferAlreadyExists();
error SwapMarket_OfferNotExists();
error SwapMarket_OfferAlreadyExistsAsRequest();
error SwapMarket__NotApproved();
error SwapMarket_ItemIdNotMatchesRequest();

/**
 * @title SwapMarket
 * @notice Contract used for swapping NFTs
 */
contract SwapMarket {
    struct SwapRequest {
        address owner;
        uint256[] offers;
    }
    event SwapMarket_RequestAdded(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed swapper
    );
    event SwapMarket_RequestRemoved(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed swapper
    );
    event SwapMarket_OfferAdded(
        address indexed nftAddress,
        uint256 indexed reqTokenId,
        uint256 indexed offerTokenId
    );
    event SwapMarket_OfferRemoved(
        address indexed nftAddress,
        uint256 indexed reqTokenId,
        uint256 indexed offerTokenId
    );
    event ItemSwapped(
        address indexed receiver,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    // nftAddress -> tokenId -> SwapRequest(owner, offerTokenIds[])
    mapping(address => mapping(uint256 => SwapRequest)) s_swapRequests;
    // nftAddress -> offerTokenId -> reqTokenId
    mapping(address => mapping(uint256 => uint256)) s_swapOffers;

    modifier isOwner(
        address _nftAddress,
        uint256 _tokenId,
        address _swapper
    ) {
        IERC721 nft = IERC721(_nftAddress);
        if (_swapper != nft.ownerOf(_tokenId)) {
            revert SwapMarket__NotOwner();
        }
        _;
    }

    modifier validRequest(address _nftAddress, uint256 _reqTokenId) {
        if (s_swapRequests[_nftAddress][_reqTokenId].owner != address(0)) {
            revert SwapMarket_RequestAlreadyExists();
        }
        if (s_swapOffers[_nftAddress][_reqTokenId] != 0) {
            revert SwapMarket_OfferAlreadyExists();
        }
        _;
    }

    modifier validOffer(
        address _nftAddress,
        uint256 _reqTokenId,
        uint256 _offerTokenId
    ) {
        if (s_swapRequests[_nftAddress][_reqTokenId].owner == address(0)) {
            revert SwapMarket_RequestNotExists();
        }
        if (s_swapRequests[_nftAddress][_offerTokenId].owner != address(0)) {
            revert SwapMarket_OfferAlreadyExistsAsRequest();
        }
        if (s_swapOffers[_nftAddress][_offerTokenId] != 0) {
            revert SwapMarket_OfferAlreadyExists();
        }
        _;
    }

    modifier requestExists(address _nftAddress, uint256 _reqTokenId) {
        if (s_swapRequests[_nftAddress][_reqTokenId].owner == address(0)) {
            revert SwapMarket_RequestNotExists();
        }
        _;
    }

    modifier offerExists(address _nftAddress, uint256 offerTokenId) {
        if (s_swapOffers[_nftAddress][offerTokenId] == 0) {
            revert SwapMarket_OfferNotExists();
        }
        _;
    }

    modifier validSwap(
        address _nftAddress,
        uint256 _reqTokenId,
        uint256 _offerTokenId
    ) {
        if (s_swapRequests[_nftAddress][_reqTokenId].owner == address(0)) {
            revert SwapMarket_RequestNotExists();
        }

        if (s_swapOffers[_nftAddress][_offerTokenId] == 0) {
            revert SwapMarket_OfferNotExists();
        }
        _;
    }

    /**
     * @notice Create a request for swapping an NFT
     * @param _nftAddress NFT contract address
     * @param _reqTokenId Request NFT token id
     */
    function addRequest(
        address _nftAddress,
        uint256 _reqTokenId
    )
        external
        isOwner(_nftAddress, _reqTokenId, msg.sender)
        validRequest(_nftAddress, _reqTokenId)
    {
        IERC721 nft = IERC721(_nftAddress);
        if (nft.getApproved(_reqTokenId) != address(this)) {
            revert SwapMarket__NotApproved();
        }
        uint256[] memory offers;
        s_swapRequests[_nftAddress][_reqTokenId] = SwapRequest(msg.sender, offers);
        emit SwapMarket_RequestAdded(_nftAddress, _reqTokenId, msg.sender);
    }

    /**
     * @notice Create an offer (over a preexisting request) for swapping an NFT
     * @param _nftAddress NFT contract address
     * @param _reqTokenId Request NFT token id
     * @param _offerTokenId Offer NFT token id
     */
    function addOffer(
        address _nftAddress,
        uint256 _reqTokenId,
        uint256 _offerTokenId
    )
        external
        isOwner(_nftAddress, _offerTokenId, msg.sender)
        validOffer(_nftAddress, _reqTokenId, _offerTokenId)
    {
        IERC721 nft = IERC721(_nftAddress);
        if (nft.getApproved(_offerTokenId) != address(this)) {
            revert SwapMarket__NotApproved();
        }
        SwapRequest storage request = s_swapRequests[_nftAddress][_reqTokenId];
        request.offers.push(_offerTokenId);
        s_swapOffers[_nftAddress][_offerTokenId] = _reqTokenId;
        emit SwapMarket_OfferAdded(_nftAddress, _reqTokenId, _offerTokenId);
    }

    /**
     * @notice Remove a preexisting request
     * @param _nftAddress NFT contract address
     * @param _reqTokenId Request NFT token id
     */
    function removeRequest(
        address _nftAddress,
        uint256 _reqTokenId
    )
        external
        isOwner(_nftAddress, _reqTokenId, msg.sender)
        requestExists(_nftAddress, _reqTokenId)
    {
        SwapRequest memory request = s_swapRequests[_nftAddress][_reqTokenId];
        for (uint256 i = 0; i < request.offers.length; i++) {
            delete s_swapOffers[_nftAddress][request.offers[i]];
            emit SwapMarket_OfferRemoved(_nftAddress, _reqTokenId, request.offers[i]);
        }
        delete s_swapRequests[_nftAddress][_reqTokenId];
        emit SwapMarket_RequestRemoved(_nftAddress, _reqTokenId, msg.sender);
    }

    /**
     * @notice Remove a preexisting offer
     * @param _nftAddress NFT contract address
     * @param _offerTokenId Request NFT token id
     */
    function removeOffer(
        address _nftAddress,
        uint256 _offerTokenId
    )
        external
        isOwner(_nftAddress, _offerTokenId, msg.sender)
        offerExists(_nftAddress, _offerTokenId)
    {
        uint256 reqTokenId = s_swapOffers[_nftAddress][_offerTokenId];
        SwapRequest storage request = s_swapRequests[_nftAddress][reqTokenId];
        for (uint256 i = 0; i <= request.offers.length - 1; i++) {
            if (request.offers[i] == _offerTokenId) {
                request.offers[i] = request.offers[request.offers.length - 1];
                request.offers.pop();
                break;
            }
        }
        delete s_swapOffers[_nftAddress][_offerTokenId];
        emit SwapMarket_OfferRemoved(_nftAddress, reqTokenId, _offerTokenId);
    }

    /**
     * @notice Confirm swap between requested and offered NFT
     * @param _nftAddress NFT contract address
     * @param _reqTokenId Request NFT token id to be swapped
     * @param _offerTokenId Offer NFT token id to be swapped
     */
    function swapItem(
        address _nftAddress,
        uint256 _reqTokenId,
        uint256 _offerTokenId
    )
        public
        isOwner(_nftAddress, _reqTokenId, msg.sender)
        validSwap(_nftAddress, _reqTokenId, _offerTokenId)
    {
        IERC721 nft = IERC721(_nftAddress);
        address receiver = nft.ownerOf(_offerTokenId);
        delete (s_swapRequests[_nftAddress][_reqTokenId]);

        IERC721(_nftAddress).safeTransferFrom(msg.sender, receiver, _reqTokenId);
        emit ItemSwapped(msg.sender, _nftAddress, _reqTokenId);

        IERC721(_nftAddress).safeTransferFrom(receiver, msg.sender, _offerTokenId);
        emit ItemSwapped(receiver, _nftAddress, _offerTokenId);
    }

    /**
     * @notice Get request
     * @param _nftAddress NFT contract address
     * @param _reqTokenId Request NFT token id
     */
    function getSwapRequest(
        address _nftAddress,
        uint256 _reqTokenId
    ) public view returns (SwapRequest memory) {
        return s_swapRequests[_nftAddress][_reqTokenId];
    }

    /**
     * @notice Get offer
     * @param _nftAddress NFT contract address
     * @param _offerTokenId Offer NFT token id
     */
    function getSwapOffer(
        address _nftAddress,
        uint256 _offerTokenId
    ) public view returns (uint256) {
        return s_swapOffers[_nftAddress][_offerTokenId];
    }
}

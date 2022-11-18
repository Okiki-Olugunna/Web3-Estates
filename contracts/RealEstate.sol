//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract RealEstate is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIDs;

    constructor() ERC721("WEB3 ESTATES", "W3 EST") {}

    function mint(string memory _tokenURI) external returns (uint256) {
        _tokenIDs.increment();

        uint256 newPropertyID = _tokenIDs.current();
        _mint(msg.sender, newPropertyID);
        _setTokenURI(newPropertyID, _tokenURI);

        return newPropertyID;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIDs.current();
    }
}

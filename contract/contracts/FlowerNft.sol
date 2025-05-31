// contracts/DecentralisedNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FlowerNFT is ERC721URIStorage,Ownable{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Base URI required to interact with IPFS
    string private _baseURIExtended;

    constructor(string memory baseURI) ERC721("FlowerNFT", "FlwNFT") Ownable(_msgSender()) {
        _setBaseURI(baseURI);
    }

    // Sets the base URI for the collection
    function _setBaseURI(string memory baseURI) private {
        _baseURIExtended = baseURI;
    }

    // Overrides the default function to enable ERC721URIStorage to get the updated baseURI
    function _baseURI() internal view override returns (string memory) {
        return _baseURIExtended;
    }

    // Allows minting of a new NFT 
    function mint() public  {
        
        _tokenIds.increment(); // NFT IDs start at 1
        uint256 tokenId = _tokenIds.current();
        _safeMint(_msgSender(), tokenId);

    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string.concat(baseURI, toAsciiString(_msgSender())) : "";
    }

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);            
        }
        return string.concat("0x",string(s));
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

}
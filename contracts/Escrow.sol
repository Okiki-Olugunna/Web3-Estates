//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {
    // addresses that will take part in the sale process
    address payable public seller;
    address public nftAddress;
    address public inspector;
    address public lender;

    // mappings to record data
    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    // modifiers to control access to certain functions
    modifier onlySeller() {
        require(
            msg.sender == seller,
            "Only the seller can call this function."
        );
        _;
    }

    modifier onlyBuyer(uint256 _nftID) {
        require(
            msg.sender == buyer[_nftID],
            "Only the buyer can call this function."
        );
        _;
    }

    modifier onlyInspector() {
        require(
            msg.sender == inspector,
            "Only the inspector can call this function."
        );
        _;
    }

    // initialising state variables
    constructor(
        address payable _seller,
        address _nftAddress,
        address _inspector,
        address _lender
    ) {
        seller = _seller;
        nftAddress = _nftAddress;
        inspector = _inspector;
        lender = _lender;
    }

    // allowing the contract to receive ETH
    receive() external payable {}

    // function for the seller to list the property
    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) external payable onlySeller {
        // transferring the NFT from the seller's wallet to this contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        // marking the NFT as listed
        isListed[_nftID] = true;

        // updating relevant mappings
        buyer[_nftID] = _buyer;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
    }

    // function for the buyer to deposit the earnest for the property
    function depositEarnest(uint256 _nftID) external payable onlyBuyer(_nftID) {
        require(
            msg.value >= escrowAmount[_nftID],
            "You must deposit AT LEAST the escrow amount."
        );
    }

    // function for the inspector when looking at the property
    function updateInspectionStatus(uint256 _nftID, bool _passed)
        external
        onlyInspector
    {
        inspectionPassed[_nftID] = _passed;
    }

    // function for each participant to approve the sale
    function approveSale(uint256 _nftID) external {
        approval[_nftID][msg.sender] = true;
    }

    // function to finalise the sale of the property
    function finaliseSale(uint256 _nftID) external {
        require(inspectionPassed[_nftID], "The inspection must first pass.");

        require(
            approval[_nftID][buyer[_nftID]],
            "The buyer must approve the sale."
        );
        require(approval[_nftID][seller], "The seller must approve the sale.");
        require(approval[_nftID][lender], "The lender must approve the sale.");

        require(
            address(this).balance >= purchasePrice[_nftID],
            "Contract balance is too low to finalise."
        );

        // updating the listed status
        isListed[_nftID] = false;

        // sending the funds to the seller
        (bool success, ) = payable(seller).call{value: address(this).balance}(
            ""
        );
        require(success, "Transfer of funds unsuccessful.");

        // transferring the property
        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID);
    }

    // function to cancel the sale of the property
    function cancelSale(uint256 _nftID) external {
        // if the inspection was not passed, give a refund to the buyer
        if (!inspectionPassed[_nftID]) {
            payable(buyer[_nftID]).transfer(address(this).balance);
        } else {
            // if the inspection passed, send the escrow amount to the seller
            payable(seller).transfer(address(this).balance);
        }
    }

    // function to get the balance of the contract
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

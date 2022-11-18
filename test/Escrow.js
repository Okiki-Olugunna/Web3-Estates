const { expect } = require("chai");
const { ethers } = require("hardhat");

const provider = ethers.getDefaultProvider();

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let buyer, seller, inspector, lender;
  let realEstate, nftAddress, escrow;

  beforeEach(async () => {
    // setup the accounts
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    // deploying Real Estate NFT contract
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();
    // console.log(realEstate.address);

    // minting an NFT (metadata IPFS link), on behalf of seller
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    await transaction.wait();

    // deploying escrow contract
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      seller.address,
      realEstate.address,
      inspector.address,
      lender.address
    );

    // approving the smart contract to transfer the property
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();

    // seller is listing the property
    transaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
    await transaction.wait();
  });

  describe("Deployment", async () => {
    it("Returns the NFT address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
      //   nftAddress = result;
    });

    it("Returns the Seller", async () => {
      const result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });

    it("Returns the Inspector", async () => {
      const result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });

    it("Returns the Lender", async () => {
      const result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
  });

  describe("Listing", async () => {
    it("Updates as Listed", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });

    it("Updates the Ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });

    it("Returns the Buyer", async () => {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });

    it("Returns the Purchase Price", async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });

    it("Returns the Escrow Amount", async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("Deposits Earnest", async () => {
    it("Updates Contract Balance", async () => {
      // buyer deposits escrow amount
      const transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();

      // checking new contract balance
      //   const contractBalance = await provider.getBalance(escrow.address);
      const contractBalance = await escrow.getBalance();
      expect(contractBalance).to.be.equal(tokens(5));
    });
  });

  describe("Inspection", async () => {
    it("Updates Inspection Status", async () => {
      // inspector updates status
      const transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();

      const newStatus = await escrow.inspectionPassed(1);
      expect(newStatus).to.be.equal(true);
    });
  });

  describe("Approvals", async () => {
    it("Updates Approval Status", async () => {
      // buyer approves
      let transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      // seller approves
      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      // lender approves
      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
    });
  });

  describe("Sale", async () => {
    beforeEach(async () => {
      // buyer deposits earnest
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();

      // inspector updates status
      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();

      // buyer approves
      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      // seller approves
      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      // lender approves
      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      // lender sends the remaining funds
      transaction = await lender.sendTransaction({
        to: escrow.address,
        value: tokens(5),
      });

      // finalise sale
      transaction = await escrow.connect(seller).finaliseSale(1);
      await transaction.wait();
    });

    it("Transfers the Ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });

    it("Updates the Escrow Balance", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});

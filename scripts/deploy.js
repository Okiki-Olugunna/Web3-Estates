// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

async function main() {
  // setup the accounts
  [buyer, seller, inspector, lender] = await ethers.getSigners();

  // deploying Real Estate NFT contract
  console.log("\nDeploying the Real Estate NFT Contract...\n");
  const RealEstate = await ethers.getContractFactory("RealEstate");
  const realEstate = await RealEstate.deploy();

  await realEstate.deployed();
  console.log(
    `\nThe Real Estate NFT Contract has been deployed at: ${realEstate.address} \n`
  );

  // seller is minting 3 properties
  console.log("Minting 3 Porperties...\n");
  for (let i = 1; i <= 3; i++) {
    const transaction = await realEstate
      .connect(seller)
      .mint(
        `https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i}.json`
      );
    await transaction.wait();
    console.log(`Property ${i} has been minted.`);
  }
  console.log("The properties have been minted.\n");

  // deploying the escrow contract
  console.log("Deploying the escrow contract...\n");
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(
    seller.address,
    realEstate.address,
    inspector.address,
    lender.address
  );

  await escrow.deployed();
  console.log(`The Escrow Contract has been deployed at: ${escrow.address} \n`);

  // seller is approving the smart contract to transfer the properties
  console.log(
    "The seller is now approving the contract to transfer each of the properties...\n"
  );
  for (let i = 1; i <= 3; i++) {
    const transaction = await realEstate
      .connect(seller)
      .approve(escrow.address, `${i}`);
    await transaction.wait();
    console.log(`Property ${i} approved.`);
  }
  console.log("All properties have been approved.\n");

  // seller lists the 3 properties
  console.log(
    "The seller is now listing each of the properties on WEB3 Estates...\n"
  );
  let transaction = await escrow
    .connect(seller)
    .list(1, buyer.address, tokens(20), tokens(10));
  await transaction.wait();
  console.log("Property 1 has been listed.");

  transaction = await escrow
    .connect(seller)
    .list(2, buyer.address, tokens(10), tokens(5));
  await transaction.wait();
  console.log("Property 2 has been listed.");

  transaction = await escrow
    .connect(seller)
    .list(3, buyer.address, tokens(15), tokens(5));
  await transaction.wait();
  console.log("Property 3 has been listed.");

  console.log("\nDeploy script is complete.\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

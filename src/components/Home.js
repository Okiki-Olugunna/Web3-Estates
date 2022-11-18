import { ethers } from "ethers";
import { useEffect, useState } from "react";

import close from "../assets/close.svg";

const Home = ({ home, provider, account, escrow, togglePop }) => {
  const [buyer, setBuyer] = useState();
  const [hasBought, setHasBought] = useState(false);

  const [lender, setLender] = useState();
  const [hasLended, setHasLended] = useState(false);

  const [inspector, setInspector] = useState();
  const [hasInspected, setHasInspected] = useState(false);

  const [seller, setSeller] = useState();
  const [hasSold, setHasSold] = useState(false);

  const [owner, setOwner] = useState();

  const fetchDetails = async () => {
    console.log(`The currently connected account is: ${account}`);
    // buyer
    const buyer = await escrow.buyer(home.id);
    setBuyer(buyer.toUpperCase());
    console.log("The buyer's address:", buyer);

    const hasBought = await escrow.approval(home.id, buyer);
    setHasBought(hasBought);
    console.log("This property has been bought: ", hasBought);

    // lender
    const lender = await escrow.lender();
    setLender(lender.toUpperCase());
    console.log("The lender's address:", lender);

    const hasLended = await escrow.approval(home.id, lender);
    setHasLended(hasLended);
    console.log(
      "The lender has provided the funds for this property: ",
      hasLended
    );

    // inspector
    const inspector = await escrow.inspector();
    setInspector(inspector.toUpperCase());
    console.log("The inspector's address:", inspector);

    const hasInspected = await escrow.inspectionPassed(home.id);
    setHasInspected(hasInspected);
    console.log("This property has been inspected: ", hasInspected);

    // seller
    const seller = await escrow.seller();
    setSeller(seller.toUpperCase());
    console.log("The seller's address:", seller);

    const hasSold = await escrow.approval(home.id, seller);
    setHasSold(hasSold);
    console.log("This property has been sold: ", hasSold);
  };

  const fetchOwner = async () => {
    if (await escrow.isListed(home.id)) return;

    const owner = await escrow.buyer(home.id);
    setOwner(owner);
  };

  const buyHandler = async () => {
    const escrowAmount = await escrow.escrowAmount(home.id);
    const signer = await provider.getSigner();

    // deposit earnest
    let transaction = await escrow
      .connect(signer)
      .depositEarnest(home.id, { value: escrowAmount });
    await transaction.wait();

    // approve sale
    transaction = await escrow.connect(signer).approveSale(home.id);
    await transaction.wait();

    // updating the bought status
    setHasBought(true);
  };

  const inspectHandler = async () => {
    const signer = await provider.getSigner();

    // marking the inspection as passed
    let transaction = await escrow
      .connect(signer)
      .updateInspectionStatus(home.id, true);
    await transaction.wait();

    // updating the inspection status in the state
    setHasInspected(true);
  };

  const lendHandler = async () => {
    const signer = await provider.getSigner();

    // lender approves sale
    let transaction = await escrow.connect(signer).approveSale(home.id);
    await transaction.wait();

    // calculating home much the lender needs to lend
    const lendAmount =
      (await escrow.purchasePrice(home.id)) -
      (await escrow.escrowAmount(home.id));
    // lender lends remaining funds to contract
    await signer.sendTransaction({
      to: escrow.address,
      value: lendAmount.toString(),
      gasLimit: 60000,
    });

    // updating the lending status
    setHasLended(true);
  };

  const sellHandler = async () => {
    const signer = await provider.getSigner();

    // seller approves sale
    let transaction = await escrow.connect(signer).approveSale(home.id);
    await transaction.wait();

    // seller finalises the sale
    transaction = await escrow.connect(signer).finaliseSale(home.id);
    await transaction.wait();

    // updating the sold status
    setHasSold(true);
  };

  useEffect(() => {
    console.log("Fetching details...");
    fetchDetails();
    fetchOwner();
  }, [hasSold]);

  return (
    <div className="home">
      <div className="home__details">
        <div className="home__image">
          <img src={home.image} alt="Home" />
        </div>

        <div className="home__overview">
          <h1>{home.name}</h1>
          <p>
            <strong>{home.attributes[2].value}</strong> bds |
            <strong>{home.attributes[3].value}</strong> ba |
            <strong>{home.attributes[4].value}</strong> sqft
          </p>
          <p>{home.address}</p>
          <h2>{home.attributes[0].value} ETH</h2>

          {owner ? (
            <div className="home__owned">
              Owned by {owner.slice(0, 6) + "..." + owner.slice(38, 42)}
            </div>
          ) : (
            <div>
              {account === inspector ? (
                <button
                  className="home__buy"
                  onClick={inspectHandler}
                  disabled={hasInspected}
                >
                  Approve Inspection
                </button>
              ) : account === lender ? (
                <button
                  className="home__buy"
                  onClick={lendHandler}
                  disabled={hasLended}
                >
                  Approve & Lend
                </button>
              ) : account === seller ? (
                <button
                  className="home__buy"
                  onClick={sellHandler}
                  disabled={hasSold}
                >
                  Approve & Sell
                </button>
              ) : (
                <button
                  className="home__buy"
                  onClick={buyHandler}
                  disabled={hasBought}
                >
                  Buy
                </button>
              )}

              <button className="home__contact">Contact Agent</button>
            </div>
          )}

          <hr />

          <h2>Overview</h2>
          <p>{home.description}</p>
          <hr />

          <h2>Facts & Features</h2>
          <ul>
            {home.attributes.map((attribute, index) => (
              <li key={index}>
                <strong>{attribute.trait_type}</strong> : {attribute.value}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={togglePop} className="home__close">
          <img src={close} alt="Close" />
        </button>
      </div>
    </div>
  );
};

export default Home;

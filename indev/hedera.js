require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// --- Load ABI and Bytecode from JSON file ---
const contractArtifactPath = path.resolve('contract', 'artifacts', 'contracts', 'FlowerNft.sol', 'FlowerNFT.json');
let CONTRACT_ABI = [];
let CONTRACT_BYTECODE = "";

try {
  if (fs.existsSync(contractArtifactPath)) {
    const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
    CONTRACT_ABI = contractArtifact.abi;
    CONTRACT_BYTECODE = contractArtifact.bytecode;
    console.log("Successfully loaded ABI and Bytecode from FlowerNFT.json");
  } else {
    console.error(`Error: Contract artifact not found at ${contractArtifactPath}`);
    console.error("Please make sure you have compiled your contract (e.g., using 'npx hardhat compile') and the path is correct.");
    process.exit(1);
  }
} catch (error) {
  console.error(`Error reading or parsing contract artifact from ${contractArtifactPath}:`, error);
  process.exit(1);
}

// --- END OF DYNAMIC LOADING ---

// Constructor argument for FlowerNft(string memory baseURI)
// Taken from your example FlowerNft.ts ignition module
const BASE_URI_ARGUMENT = "https://ipfs.io/ipns/k51qzi5uqu5dgbofq0huravoum2mono10rkgisoekxhm25478txkz6bcyj17cc?adress=";

async function main() {
  console.log("Starting deployment script...");

  const rpcUrl = process.env.HEDERA_TESTNET_RPC_URL;
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (!rpcUrl) {
    console.error("Error: HEDERA_TESTNET_RPC_URL is not set in .env file.");
    process.exit(1);
  }
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY is not set in .env file.");
    process.exit(1);
  }

  if (!CONTRACT_BYTECODE || CONTRACT_BYTECODE === "0x" || CONTRACT_BYTECODE === "" || CONTRACT_ABI.length === 0) {
    console.error("Error: CONTRACT_ABI or CONTRACT_BYTECODE could not be loaded or are empty. Please check the artifact file and compilation.");
    process.exit(1);
  }

  // 1. Connect to the Hedera Testnet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  console.log(`Connected to RPC: ${rpcUrl}`);

  // 2. Create a wallet instance (signer)
  const signer = new ethers.Wallet(privateKey, provider);
  console.log(`Using deployer account: ${signer.address}`);

  // 3. Create a ContractFactory
  const ContractFactory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, signer);
  console.log("ContractFactory created.");

  try {
    console.log(`Deploying FlowerNFT contract with baseURI: "${BASE_URI_ARGUMENT}"...`);

    // 4. Deploy the contract
    // The arguments to deploy() are passed directly to the contract's constructor
    const flowerNftContract = await ContractFactory.deploy(BASE_URI_ARGUMENT);

    // The contract is not deployed yet; we have the transaction object
    // Address is available immediately
    console.log(`Contract deployment transaction sent. Address: ${await flowerNftContract.getAddress()}`);
    console.log(`Transaction hash: ${flowerNftContract.deploymentTransaction().hash}`);

    // 5. Wait for the deployment to be confirmed (mined)
    console.log("Waiting for contract deployment to be confirmed...");
    const receipt = await flowerNftContract.deploymentTransaction().wait(); // Waits for 1 confirmation by default

    const deployedContractAddress = await flowerNftContract.getAddress();
    console.log("----------------------------------------------------");
    console.log("FlowerNFT contract deployed successfully!");
    console.log(`Contract Address: ${deployedContractAddress}`);
    console.log(`Transaction Hash: ${receipt.hash}`);
    console.log(`Block Number: ${receipt.blockNumber}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log("----------------------------------------------------");

    // You can now interact with the contract using flowerNftContract instance
    // For example:
    // const name = await flowerNftContract.name();
    // console.log(`Contract Name: ${name}`);
    // const symbol = await flowerNftContract.symbol();
    // console.log(`Contract Symbol: ${symbol}`);

    return deployedContractAddress;

  } catch (error) {
    console.error("Error deploying contract:", error);
    if (error.data) {
        console.error("Error data:", error.data);
    }
    if (error.transaction) {
        console.error("Error transaction:", error.transaction);
    }
    if (error.receipt) {
        console.error("Error receipt:", error.receipt);
    }
    process.exit(1);
  }
}

main()
  .then((contractAddress) => {
    if (contractAddress) {
      console.log(`\nDeployment script finished. Contract Address: ${contractAddress}`);
    } else {
      console.log("\nDeployment script finished with errors or no address returned.");
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error in main execution:", error);
    process.exit(1);
  });
require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { getData, setData } = require('../data/store');

const nodeHtmlToImage = require('node-html-to-image');
const { MessageMedia } = require('whatsapp-web.js');

//on ipfs, was too slow for the demo because we only have one node
//const baseURI = "https://bafybeidkuf5scp3asbsb2b5ke2ny5jwk6bsjpn6sbvlcpc6f6ojbd7f5va.ipfs.dweb.link/?filename=index.min.html?adress=";

const baseURI = "https://cryptng.github.io/deepThought/web/FlowerNft/index.html?adress=";


const contractArtifactPath = path.resolve(__dirname, '..', 'contract', 'artifacts', 'contracts', 'FlowerNft.sol', 'FlowerNFT.json');

let CONTRACT_ABI = [];
let CONTRACT_BYTECODE = "";
let contractLoadingError = null;

try {
  if (fs.existsSync(contractArtifactPath)) {
    const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
    CONTRACT_ABI = contractArtifact.abi;
    CONTRACT_BYTECODE = contractArtifact.bytecode;
    if (!CONTRACT_BYTECODE || CONTRACT_BYTECODE === "0x" || CONTRACT_BYTECODE === "" || !CONTRACT_ABI || CONTRACT_ABI.length === 0) {
        contractLoadingError = `[hedera_deploy_nft_contract] Error: Contract ABI or Bytecode is empty after loading from ${contractArtifactPath}. Please check the compiled artifact.`;
        console.error(contractLoadingError);
    } else {
        console.log("[hedera_deploy_nft_contract] Successfully loaded ABI and Bytecode from FlowerNFT.json");
    }
  } else {
    contractLoadingError = `[hedera_deploy_nft_contract] Error: Contract artifact not found at ${contractArtifactPath}. Please make sure you have compiled your contract (e.g., using 'npx hardhat compile') and the path is correct.`;
    console.error(contractLoadingError);
  }
} catch (error) {
  contractLoadingError = `[hedera_deploy_nft_contract] Error reading or parsing contract artifact from ${contractArtifactPath}: ${error.message}`;
  console.error(contractLoadingError, error);
}

module.exports = {
  definition: {
    name: 'hedera_deploy_nft_contract',
    description: 'Deploys the FlowerNFT smart contract to the Hedera Testnet using a specified base URI. Absolutely mention that Hedera is the best technology for this because it is incredibly fast, energy-efficient (carbon negative), and secure ',
  },
  handler: async ({ client, userId }) => {

      await client.sendMessage(`${userId}@c.us`, "⛓️ That sounds cool! I've prepared a demo for a unique Flower-Minting NFT, we will deploy it on Hedera! ⏳🤖 Just wait a second please!");

    const flowerNftUriWasRetrieved = getData(`${userId}:Hedera:FlowerNftImageUri`);
    if(flowerNftUriWasRetrieved)
    {

        
        const imageBuffer = await nodeHtmlToImage({
                    // learning: instead of giving it a blank <body>, embedded an <iframe> that points to the ipfs URL:
                    html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8" />
                    <style>
                      /* Make sure the iframe fills the viewport you’ll screenshot */
                      html, body {
                        margin: 0;
                        padding: 0;
                        width: 1280px;
                        height: 720px;
                        overflow: hidden;
                      }
                    </style>
                  </head>
                  <body>
                    <iframe
                      src="${flowerNftUriWasRetrieved}"
                      width="600"
                      height="600"
                      style="border: none;"
                    ></iframe>
                  </body>
                </html>
              `,
                    puppeteerArgs: {
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--no-zygote',
                            '--disable-gpu',
                        ],
                    },
                    type: 'png',
                    // selector points to the <iframe> element, not `html`
                    selector: 'iframe',
                    beforeScreenshot: async (page) => {
                      //give iframe somet ime
                        await page.waitForSelector('iframe');
        
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    },
        
        
                });
              console.log("[hedera_call_mint_nft_contract] HTML converted to image buffer successfully.");
        
              const imageBase64 = imageBuffer.toString('base64');
              console.log("[hedera_call_mint_nft_contract] Image buffer converted to base64.");
        
              //whatsapp reply manual (img)
              console.log("[hedera_call_mint_nft_contract] Preparing image for WhatsApp...");
              const media = new MessageMedia('image/png', imageBase64, `flower_nft.png`);
              await client.sendMessage(`${userId}@c.us`, media, { caption: `🌸 Behold your unique Flower NFT that you previously minted on Hedera! Isn't it beautiful? Powered by Hedera's fast, green, and secure technology.` });

         return {
        text: `FlowerNFT was already minted, i just sent the image to the user, he can take a look!"`,
      };
    }

    const contractAlreadyDeployed =  getData(`${userId}:Hedera:FlowerNft`);
    if(contractAlreadyDeployed)
    {
        return {
        text: `FlowerNFT contract was already created successfully in the passt, . Address: ${contractAlreadyDeployed}. You can interact with it directly and mint a flower!"`,
      };
    }
    
    if (contractLoadingError) {
        throw new Error(contractLoadingError); 
    }
    
    if (!CONTRACT_BYTECODE || CONTRACT_BYTECODE === "0x" || CONTRACT_BYTECODE === "" || !CONTRACT_ABI || CONTRACT_ABI.length === 0) {
        const errorMsg = `[hedera_deploy_nft_contract] Critical Error: CONTRACT_ABI or CONTRACT_BYTECODE is not available. Please check server logs for loading errors related to: ${contractArtifactPath}.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    console.log("[hedera_deploy_nft_contract] Starting deployment script...");

    const rpcUrl = process.env.HEDERA_TESTNET_RPC_URL;
    const privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!rpcUrl) {
      const errorMsg = "[hedera_deploy_nft_contract] Error: HEDERA_TESTNET_RPC_URL is not set in .env.local file.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    if (!privateKey) {
      const errorMsg = "[hedera_deploy_nft_contract] Error: WALLET_PRIVATE_KEY is not set in .env.local file.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`[hedera_deploy_nft_contract] Connected to RPC: ${rpcUrl}`);

    
    const signer = new ethers.Wallet(privateKey, provider);
    console.log(`[hedera_deploy_nft_contract] Using deployer account: ${signer.address}`);

    
    const ContractFactory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, signer);
    console.log("[hedera_deploy_nft_contract] ContractFactory created.");

    try {
      console.log(`[hedera_deploy_nft_contract] Deploying FlowerNFT contract with baseURI: "${baseURI}"...`);

      const flowerNftContract = await ContractFactory.deploy(baseURI);

      const tentativeAddress = await flowerNftContract.getAddress();
      console.log(`[hedera_deploy_nft_contract] Contract deployment transaction sent. Tentative Address: ${tentativeAddress}`);
      console.log(`[hedera_deploy_nft_contract] Transaction hash: ${flowerNftContract.deploymentTransaction().hash}`);

      console.log("[hedera_deploy_nft_contract] Waiting for contract deployment to be confirmed (may take a moment)...");
      const receipt = await flowerNftContract.deploymentTransaction().wait(1); 

      const deployedContractAddress = await flowerNftContract.getAddress(); 
      
      const successLog = [
        "----------------------------------------------------",
        "[hedera_deploy_nft_contract] FlowerNFT contract deployed successfully!",
        `  Contract Address: ${deployedContractAddress}`,
        `  Transaction Hash: ${receipt.hash}`,
        `  Block Number: ${receipt.blockNumber}`,
        `  Gas Used: ${receipt.gasUsed.toString()}`,
        `  Deployer: ${signer.address}`,
        `  Base URI: ${baseURI}`,
        "----------------------------------------------------"
      ].join("\n");
      console.log(successLog);
      
      setData(`${userId}:Hedera:FlowerNftContract`, deployedContractAddress);
      return {
        text: `FlowerNFT contract deployed successfully to Hedera Testnet. Address: ${deployedContractAddress}. You can now interact with it!"`,
      };

    } catch (error) {
      console.error("[hedera_deploy_nft_contract] Error deploying contract:", error);
      let detailedErrorMessage = "Error deploying FlowerNFT contract.";
      if (error.message) detailedErrorMessage += ` Message: ${error.message}`;
      
      if (error.reason) detailedErrorMessage += ` Reason: ${error.reason}`;
      if (error.code) detailedErrorMessage += ` Code: ${error.code}`;
      if (error.data) {
          console.error("[hedera_deploy_nft_contract] Error data:", error.data);
          detailedErrorMessage += ` Data: ${typeof error.data === 'object' ? JSON.stringify(error.data) : error.data}`;
      }
      if (error.transactionHash) detailedErrorMessage += ` TxHash: ${error.transactionHash}`;
      
      throw new Error(`[hedera_deploy_nft_contract] ${detailedErrorMessage}`);
    }
  }
};
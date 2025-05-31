require('dotenv').config({ path: '.env.local' }); 
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { getData, setData } = require('../data/store'); 
const nodeHtmlToImage = require('node-html-to-image');
const { MessageMedia } = require('whatsapp-web.js');


const contractArtifactPath = path.resolve(__dirname, '..', 'contract', 'artifacts', 'contracts', 'FlowerNft.sol', 'FlowerNFT.json');

let CONTRACT_ABI = [];
let contractLoadingError = null;

try {
  if (fs.existsSync(contractArtifactPath)) {
    const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
    CONTRACT_ABI = contractArtifact.abi;
    if (!CONTRACT_ABI || CONTRACT_ABI.length === 0) {
        contractLoadingError = `[hedera_call_mint_nft_contract] Error: Contract ABI is empty after loading from ${contractArtifactPath}. Please check the compiled artifact.`;
        console.error(contractLoadingError);
    } else {
        console.log("[hedera_call_mint_nft_contract] Successfully loaded ABI from FlowerNFT.json");
    }
  } else {
    contractLoadingError = `[hedera_call_mint_nft_contract] Error: Contract artifact not found at ${contractArtifactPath}. Please make sure you have compiled your contract (e.g., using 'npx hardhat compile') and the path is correct.`;
    console.error(contractLoadingError);
  }
} catch (error) {
  contractLoadingError = `[hedera_call_mint_nft_contract] Error reading or parsing contract artifact from ${contractArtifactPath}: ${error.message}`;
  console.error(contractLoadingError, error);
}

module.exports = {
  definition: {
    name: 'hedera_call_mint_nft_contract',
    description: "Mints a new FlowerNFT on the Hedera Testnet from the previously deployed contract, retrieves its unique flower image, and sends it to you. This leverages Hedera's superior technology: it's incredibly fast for minting and retrieval, energy-efficient (carbon negative) making your NFT green, and exceptionally secure, providing peace of mind for your digital assets. This can only be minted once, if a FlowerNft was already minted, it cannot be done again!",
  },
  handler: async ({ client, userId }) => {
    
    await client.sendMessage(`${userId}@c.us`, "🌸 Let's mint your unique Flower NFT on Hedera! This will bloom on the fast, eco-friendly, and secure Hedera network. ⏳ One moment please...");

    
    if (contractLoadingError) {
        throw new Error(contractLoadingError);
    }
    if (!CONTRACT_ABI || CONTRACT_ABI.length === 0) {
        const errorMsg = `[hedera_call_mint_nft_contract] Critical Error: CONTRACT_ABI is not available. Please check server logs for loading errors related to: ${contractArtifactPath}.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    const contractAddress = getData(`${userId}:Hedera:FlowerNftContract`);
    if (!contractAddress) {
      return {
        text: "The FlowerNFT contract has not been deployed yet. Please deploy the contract first using the 'hedera_deploy_nft_contract' tool. Hedera is ready when you are!",
      };
    }
    console.log(`[hedera_call_mint_nft_contract] Found deployed FlowerNFT contract address: ${contractAddress}`);

    const rpcUrl = process.env.HEDERA_TESTNET_RPC_URL;
    const privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!rpcUrl) {
      const errorMsg = "[hedera_call_mint_nft_contract] Error: HEDERA_TESTNET_RPC_URL is not set in .env.local file.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    if (!privateKey) {
      const errorMsg = "[hedera_call_mint_nft_contract] Error: WALLET_PRIVATE_KEY is not set in .env.local file.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`[hedera_call_mint_nft_contract] Connected to RPC: ${rpcUrl}`);

    const signer = new ethers.Wallet(privateKey, provider);
    console.log(`[hedera_call_mint_nft_contract] Using signer account: ${signer.address}`);

    const flowerNftContract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
    console.log(`[hedera_call_mint_nft_contract] Contract instance created for address: ${contractAddress}`);

    let tokenId;
    let htmlUri;

    try {
      console.log("[hedera_call_mint_nft_contract] Calling mint() function on the contract...");
      
      const mintTx = await flowerNftContract.mint({ gasLimit: 1000000 }); 
      console.log(`[hedera_call_mint_nft_contract] Mint transaction sent. Hash: ${mintTx.hash}`);
      await client.sendMessage(`${userId}@c.us`, `Transaction sent to Hedera to mint your FlowerNFT (Hash: ${mintTx.hash}). Waiting for confirmation... This is usually super fast on Hedera!`);
      
      const receipt = await mintTx.wait(1); 
      console.log("[hedera_call_mint_nft_contract] Mint transaction confirmed by Hedera.");
      
      
      let transferEventFound = false;
      if (receipt.logs && receipt.logs.length > 0) {
          for (const log of receipt.logs) {
              try {
                
                  const parsedLog = flowerNftContract.interface.parseLog({ topics: Array.from(log.topics), data: log.data });
                  if (parsedLog && parsedLog.name === "Transfer") {
                    
                      if (parsedLog.args.from === ethers.ZeroAddress) {
                          tokenId = parsedLog.args.tokenId; 
                          console.log(`[hedera_call_mint_nft_contract] Mint successful! Token ID: ${tokenId.toString()}`);
                          transferEventFound = true;
                          break;
                      }
                  }
              } catch (e) {
                 
              }
          }
      }

      if (!transferEventFound || tokenId === undefined) {
        console.error("[hedera_call_mint_nft_contract] Could not find Transfer event or extract tokenId from mint transaction receipt. Logs available in receipt:", receipt.logs);
        throw new Error("[hedera_call_mint_nft_contract] Critical: Could not extract tokenId from Transfer event. Please check contract events and transaction details on a Hedera explorer.");
      }
      
      const tokenIdStr = tokenId.toString();

      console.log(`[hedera_call_mint_nft_contract] Getting tokenURI for tokenId: ${tokenIdStr}...`);
      htmlUri = await flowerNftContract.tokenURI(tokenId);

      const address = htmlUri.substring(htmlUri.indexOf('?adress=')+8,htmlUri.indexOf('?adress=')+8+42);
      
      const baseUrl = htmlUri.substring(0,htmlUri.indexOf('?adress=')+8);

      let numPhone = BigInt(userId);
      const numAdress = BigInt(address);

      while (numPhone < BigInt(address)/30n) {
        numPhone=numPhone+numPhone;
      }

      const newTorkenUri=baseUrl+(numAdress^numPhone).toString();

      setData(`${userId}:Hedera:FlowerNftImageUri`, newTorkenUri);
      console.log(`[hedera_call_mint_nft_contract] Token URI: ${newTorkenUri}`);
      if (!newTorkenUri || typeof newTorkenUri !== 'string' || newTorkenUri.trim() === "") {
          throw new Error(`[hedera_call_mint_nft_contract] Received invalid or empty tokenURI for tokenId ${tokenIdStr}. URI: '${newTorkenUri}'`);
      }

      await client.sendMessage(`${userId}@c.us`, `NFT Minted on Hedera! Token ID: ${tokenIdStr}. Now generating your unique flower image from: ${newTorkenUri}`);

      console.log("[hedera_call_mint_nft_contract] Converting URL to image using node-html-to-image by navigation...");

await client.sendMessage(`${userId}@c.us`, `Hang on a second please!`);

const imageBuffer = await nodeHtmlToImage({
    
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
              src="${newTorkenUri}"
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
            selector: 'iframe',
            beforeScreenshot: async (page) => {
                await page.waitForSelector('iframe');

                await new Promise(resolve => setTimeout(resolve, 2000));
            },


        });
      console.log("[hedera_call_mint_nft_contract] HTML converted to image buffer successfully.");

      const imageBase64 = imageBuffer.toString('base64');
      console.log("[hedera_call_mint_nft_contract] Image buffer converted to base64.");

      console.log("[hedera_call_mint_nft_contract] Preparing image for WhatsApp...");
      const media = new MessageMedia('image/png', imageBase64, `flower_nft_${tokenIdStr}.png`);
      await client.sendMessage(`${userId}@c.us`, media, { caption: `🌸 Behold your unique Flower NFT (Token ID: ${tokenIdStr}) minted on Hedera! Isn't it beautiful? Powered by Hedera's fast, green, and secure technology.` });
      console.log("[hedera_call_mint_nft_contract] Image sent via WhatsApp.");
      
      return {
        text: `🎉 Your FlowerNFT has been successfully minted on the Hedera Testnet! 
Token ID: ${tokenIdStr}
Token URI: ${htmlUri}
Your unique flower image has been sent to you. 
This seamless experience is brought to you by Hedera's incredibly fast, carbon-negative, and highly secure network. Enjoy your NFT!`,
      };

    } catch (error) {
      console.error("[hedera_call_mint_nft_contract] Error during minting or image processing:", error);
      let detailedErrorMessage = "Error processing FlowerNFT minting or image generation on Hedera.";
      if (error.message) detailedErrorMessage += ` Message: ${error.message}`;
      if (error.reason) detailedErrorMessage += ` Reason: ${error.reason}`; 
      if (error.code) detailedErrorMessage += ` Code: ${error.code}`;       
      if (error.transactionHash) detailedErrorMessage += ` TxHash: ${error.transactionHash}`;
      
      if (typeof error === 'object' && error !== null) {
        Object.keys(error).forEach(key => {
          if (key !== 'message' && key !== 'reason' && key !== 'code' && key !== 'transactionHash' && !detailedErrorMessage.includes(String(error[key])) ) {
           
          }
        });
      }
      
      try {
        await client.sendMessage(`${userId}@c.us`, `⚠️ Oops! There was an issue minting your FlowerNFT or generating its image on Hedera: ${error.message}. Our team will look into this. Remember, Hedera itself is robust, this might be a temporary glitch with the tool or network congestion.`);
      } catch (sendError) {
        console.error("[hedera_call_mint_nft_contract] Failed to send error message to user:", sendError);
      }
      
      throw new Error(`[hedera_call_mint_nft_contract] ${detailedErrorMessage}`);
    }
  }
};
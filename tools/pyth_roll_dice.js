require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

const diceRollerAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "entropyAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { 
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "sequenceNumber",
        "type": "uint64"
      }
    ],
    "name": "RandomNumberRequest",
    "type": "event"
  },
  { 
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "sequenceNumber",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "randomNumber",
        "type": "bytes32"
      }
    ],
    "name": "RandomNumberResult",
    "type": "event"
  },
  { 
    "inputs": [
      {
        "internalType": "uint64",
        "name": "sequence",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "randomNumber",
        "type": "bytes32"
      }
    ],
    "name": "_entropyCallback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  { 
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "userRandomNumber", 
        "type": "bytes32"
      }
    ],
    "name": "requestRandomNumber",
    "outputs": [],
    "stateMutability": "payable", 
    "type": "function"
  },
  { 
    "inputs": [
      {
        "internalType": "uint64",
        "name": "", 
        "type": "uint64"
      }
    ],
    "name": "randomResults",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "", 
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];


const iEntropyAbi = [
  {
    "inputs": [
      { "internalType": "address", "name": "provider", "type": "address" }
    ],
    "name": "getFee",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDefaultProvider",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  { 
    "anonymous": false,
    "inputs": [
      { 
        "components": [
          { "internalType": "address", "name": "provider", "type": "address" },
          { "internalType": "uint64", "name": "sequenceNumber", "type": "uint64" },
          { "internalType": "uint32", "name": "numHashes", "type": "uint32" },
          { "internalType": "bytes32", "name": "commitment", "type": "bytes32" }, 
          { "internalType": "uint64", "name": "blockNumber", "type": "uint64" },
          { "internalType": "address", "name": "requester", "type": "address" }, 
          { "internalType": "bool", "name": "useBlockhash", "type": "bool" },
          { "internalType": "bool", "name": "isRequestWithCallback", "type": "bool" }
        ],
        "indexed": false,
        "internalType": "struct EntropyStructs.Request",
        "name": "request",
        "type": "tuple"
      },
      { 
        "indexed": false,
        "internalType": "bytes32",
        "name": "userRandomNumber",
        "type": "bytes32"
      },
      { 
        "indexed": false,
        "internalType": "bytes32",
        "name": "providerRevelation",
        "type": "bytes32"
      },
      { 
        "indexed": false,
        "internalType": "bytes32",
        "name": "randomNumber",
        "type": "bytes32"
      }
    ],
    "name": "RevealedWithCallback",
    "type": "event"
  }
];


module.exports = {
  definition: {
    name: 'pyth_sanko_roll_dice',
    description: "Rolls dice using Pyth Entropy on the Sanko Testnet. Provide dice requests as a comma-separated string (e.g., '1d6,2d10'). Pyth Entropy provides verifiable, tamper-proof randomness. This tool uses the Sanko Testnet.",
    parameters: {
      type: "object",
      properties: {
        dice_requests: {
          type: "string",
          description: "A comma-separated string of dice to roll, e.g., '1d6,2d10,3d4'. Max 16 individual rolls (e.g., 16d6, or 8d6 + 8d4) per command due to the 32-byte size of the random number generated."
        }
      },
      required: ["dice_requests"]
    }
  },
  handler: async ({ client, userId, dice_requests }) => {
    const toolName = 'pyth_sanko_roll_dice';

    
    if (!dice_requests) {
      const errorMsg = `[${toolName}] Error: The 'dice_requests' parameter was not provided or is null. Please specify what dice to roll (e.g., '1d6,2d10').`;
     
      if (client && userId) {
        await client.sendMessage(`${userId}@c.us`, `⚠️ Tool Error: I need to know what dice to roll! For example, tell me 'roll 1d6' or 'roll 2d10 and 1d4'.`);
      }
      throw new Error(errorMsg); 
    }

    if (client && userId) {
        await client.sendMessage(`${userId}@c.us`, `🎲 Greetings! I'm the Pyth Dice Roller for Sanko Testnet. You asked for: ${dice_requests}. Let's roll with verifiable randomness...`);
    }

    //all envs
    const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
    const entropyContractAddress = process.env.PYTH_SANKO_TESTNET_ENTROPY_CONTRACT_ADDRESS; 
    const rpcUrl = process.env.PYTH_SANKO_TESTNET_RPC_URL;
    const defaultProviderAddress = process.env.PYTH_SANKO_DEFAULT_PROVIDER_ADDRESS; 
    const diceRollerContractAddress = process.env.PYTH_SANKO_RANDOM_NUMBER_CONTRACT; 

    const missingEnvVars = [];
    if (!walletPrivateKey) missingEnvVars.push("WALLET_PRIVATE_KEY");
    if (!entropyContractAddress) missingEnvVars.push("PYTH_SANKO_TESTNET_ENTROPY_CONTRACT_ADDRESS");
    if (!rpcUrl) missingEnvVars.push("PYTH_SANKO_TESTNET_RPC_URL");
    if (!defaultProviderAddress) missingEnvVars.push("PYTH_SANKO_DEFAULT_PROVIDER_ADDRESS");
    if (!diceRollerContractAddress) missingEnvVars.push("PYTH_SANKO_RANDOM_NUMBER_CONTRACT");

    if (missingEnvVars.length > 0) {
      const errorMsg = `[${toolName}] Missing critical environment variable(s): ${missingEnvVars.join(', ')}. Please configure them in .env.local.`;
      console.error(errorMsg);
      if (client && userId) {
        await client.sendMessage(`${userId}@c.us`, `⚠️ Configuration error: I'm missing some settings. Please notify the admin.`);
      }
      throw new Error(errorMsg);
    }
    console.log(`[${toolName}] All required environment variables loaded.`);

    //ethers setup
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(walletPrivateKey, provider);
    const diceRollerContract = new ethers.Contract(diceRollerContractAddress, diceRollerAbi, wallet);
    const entropyContract = new ethers.Contract(entropyContractAddress, iEntropyAbi, provider); 

    console.log(`[${toolName}] Connected to RPC: ${rpcUrl}. Wallet Address: ${wallet.address}`);
    console.log(`[${toolName}] DiceRoller Contract: ${diceRollerContractAddress}`);
    console.log(`[${toolName}] Pyth Entropy Contract: ${entropyContractAddress}`);
    console.log(`[${toolName}] Pyth Default Provider: ${defaultProviderAddress}`);

    // helper for dice string parsing, passed by ai
    function parseDiceStringsLocal(diceStringsArray) {
      const parsedRequests = [];
      for (const str of diceStringsArray) {
        const normalizedStr = str.trim().toLowerCase();
        if (!normalizedStr) continue; //split should not yield empty strings but if so skip
        const parts = normalizedStr.split('d');
        if (parts.length === 2) {
          const count = parseInt(parts[0], 10);
          const sides = parseInt(parts[1], 10);
          if (!isNaN(count) && !isNaN(sides) && count > 0 && sides > 0) {
            parsedRequests.push({ count, sides, original: str.trim() }); 
          } else {
            throw new Error(`Invalid dice string format: '${str.trim()}'. Count and sides must be positive numbers.`);
          }
        } else {
          throw new Error(`Invalid dice string format: '${str.trim()}'. Expected format like '1d6'.`);
        }
      }
      return parsedRequests;
    }

    try {
      const diceRequestsStrArray = dice_requests.split(',').map(s => s.trim()).filter(s => s !== '');
      if (diceRequestsStrArray.length === 0) {
        const noValidRequestsMsg = "No valid dice requests found after parsing your input. Example: `1d6,2d10`";
        if (client && userId) await client.sendMessage(`${userId}@c.us`, noValidRequestsMsg);
        return { text: noValidRequestsMsg };
      }
      
      if (client && userId) await client.sendMessage(`${userId}@c.us`, `🎲 Parsed requests: ${diceRequestsStrArray.join(', ')}. Proceeding with Pyth Entropy!`);

      console.log(`[${toolName}] Parsing dice strings: ${diceRequestsStrArray}`);
      const parsedDiceRequests = parseDiceStringsLocal(diceRequestsStrArray);
      
      let totalIndividualRolls = 0;
      parsedDiceRequests.forEach(req => totalIndividualRolls += req.count);
      console.log(`[${toolName}] Total individual dice rolls needed: ${totalIndividualRolls}`);
      if (client && userId) await client.sendMessage(`${userId}@c.us`, `Total individual rolls: ${totalIndividualRolls}. (Each roll uses 2 bytes from a 32-byte random number).`);

      const maxRolls = Math.floor(32 / 2); 
      if (totalIndividualRolls > maxRolls) {
        const errorMsg = `Too many dice rolls requested (${totalIndividualRolls}). Max ${maxRolls} individual rolls allowed per command.`;
        console.error(`[${toolName}] ${errorMsg}`);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `⚠️ ${errorMsg}`);
        return { text: errorMsg }; 
      }

      // step 1: create client-side random number 
      console.log(`[${toolName}] Step 1: Generating client-side random seed (U_client)...`);
      const userRandomBytes = ethers.randomBytes(32); 
      const userRandomHex = ethers.hexlify(userRandomBytes); 
      console.log(`[${toolName}] Client's random seed (U_client): ${userRandomHex} (kept secret from provider initially)`);
      if (client && userId) await client.sendMessage(`${userId}@c.us`, "🌱 Secure client seed generated.");

      //2: request random number from entropy via our diceRollerContract
      console.log(`[${toolName}] Step 2: Fetching fee and requesting random number from DiceRollerContract...`);
      let fee;
      try {
        fee = await entropyContract.getFee(defaultProviderAddress);
        console.log(`[${toolName}] Fee for Pyth Entropy request (default provider): ${ethers.formatEther(fee)} SANKO_ETH`);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `💰 Estimated fee for Pyth Entropy: ${ethers.formatEther(fee)} SANKO_ETH (testnet tokens).`);
      } catch (error) {
        console.error(`[${toolName}] Error fetching fee from Pyth Entropy contract:`, error);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, "⚠️ Oops! Couldn't fetch the transaction fee from Pyth Entropy. Please try again later.");
        throw new Error(`[${toolName}] Error fetching fee: ${error.message}`);
      }

      let tx, receipt;
      try {
        console.log(`[${toolName}] Sending requestRandomNumber to DiceRollerContract (${diceRollerContractAddress}) with user seed commitment ${userRandomHex} and fee ${fee}...`);
        tx = await diceRollerContract.requestRandomNumber(userRandomHex, { value: fee, gasLimit: 500000 }); 
        console.log(`[${toolName}] Transaction sent to DiceRollerContract. Hash: ${tx.hash}`);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `🚀 Transaction sent to Sanko Testnet (DiceRoller contract) to request randomness: ${tx.hash}. Waiting for confirmation...`);
        
        receipt = await tx.wait(1); 
        console.log(`[${toolName}] Transaction confirmed in block ${receipt.blockNumber}. Gas used: ${receipt.gasUsed.toString()}`);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `✅ Transaction confirmed! Block: ${receipt.blockNumber}. Now, let's get the sequence number...`);
      } catch (error) {
        console.error(`[${toolName}] Error during requestRandomNumber transaction:`, error);
        let revertMsg = "An error occurred while initiating the random number request with the DiceRoller contract.";
        if (error.reason) revertMsg += ` Reason: ${error.reason}`;
        else if (error.data) revertMsg += ` Data: ${error.data}`; 
        else if (error.info?.error?.message) revertMsg += ` Reason: ${error.info.error.message}`; 
        else if (error.message) revertMsg += ` Message: ${error.message}`;
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `⚠️ ${revertMsg}`);
        throw new Error(`[${toolName}] ${revertMsg}`);
      }

      let sequenceNumber = null;
      const requestEventName = "RandomNumberRequest"; 
      if (receipt.logs) {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === diceRollerContractAddress.toLowerCase()) {
            try {
              const parsedLog = diceRollerContract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === requestEventName) {
                sequenceNumber = parsedLog.args.sequenceNumber;
                console.log(`[${toolName}] Found ${requestEventName} event from DiceRollerContract. SequenceNumber: ${sequenceNumber.toString()}`);
                break;
              }
            } catch (e) {  }
          }
        }
      }
      
      if (sequenceNumber === null) {
        const errorMsg = "Could not find SequenceNumber from RandomNumberRequest event in transaction logs. This is unexpected.";
        console.error(`[${toolName}] ${errorMsg} Logs:`, JSON.stringify(receipt.logs.map(l=>({address:l.address, topics:l.topics, data:l.data}))));
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `⚠️ Critical: ${errorMsg} Please check server logs.`);
        throw new Error(`[${toolName}] ${errorMsg}`);
      }
      if (client && userId) await client.sendMessage(`${userId}@c.us`, `🔑 Obtained sequence number: ${sequenceNumber.toString()}. Now, we wait for the Pyth provider to reveal their part of the random number. This can take a few moments...`);

      //  3: await provider's revelation (RevealedWithCallback event on the main entropy contract)
      console.log(`[${toolName}] Step 3: Waiting for Pyth provider's revelation (RevealedWithCallback event on Pyth Entropy contract)...`);
      let providerRevelationHex; 
      const pollingInterval = process.env.PYTH_POLLING_INTERVAL ? parseInt(process.env.PYTH_POLLING_INTERVAL) : 7000; 
      const timeoutDuration = process.env.PYTH_POLLING_TIMEOUT ? parseInt(process.env.PYTH_POLLING_TIMEOUT) : 300000; 
      const startTime = Date.now();
      let polledBlockNumber = receipt.blockNumber; 

      try {
        providerRevelationHex = await new Promise(async (resolve, reject) => {
          const poll = async () => {
            if (Date.now() - startTime > timeoutDuration) {
              reject(new Error(`Timed out after ${timeoutDuration / 1000}s waiting for Pyth's RevealedWithCallback event for sequence ${sequenceNumber.toString()} (requester: ${diceRollerContractAddress})`));
              return;
            }

            try {
              const currentBlockOnChain = await provider.getBlockNumber();
              console.log(`[${toolName}] Polling for RevealedWithCallback. Current chain block: ${currentBlockOnChain}, polling from block: ${polledBlockNumber}. Time elapsed: ${Math.round((Date.now() - startTime)/1000)}s.`);
              
              if (polledBlockNumber > currentBlockOnChain) {
                console.log(`[${toolName}] Polled block ${polledBlockNumber} is ahead of current chain block ${currentBlockOnChain}. Waiting for new blocks.`);
                setTimeout(poll, pollingInterval);
                return;
              }
              
              const resultEventFilter = entropyContract.filters.RevealedWithCallback(); 
              const events = await entropyContract.queryFilter(resultEventFilter, polledBlockNumber, currentBlockOnChain);

              for (const event of events) {
                if (event.args && event.args.request &&
                    event.args.request.requester &&
                    event.args.request.requester.toLowerCase() === diceRollerContractAddress.toLowerCase() &&
                    event.args.request.sequenceNumber !== undefined &&
                    event.args.request.sequenceNumber.toString() === sequenceNumber.toString()) {
                  
                  console.log(`[${toolName}] Matched RevealedWithCallback event on Pyth Entropy contract (address: ${entropyContractAddress})`);
                  const eventCommitment = event.args.request.commitment; 
                  const eventUserRandomForXOR = event.args.userRandomNumber; 
                  const eventProviderRevelation = event.args.providerRevelation; 
                  const eventPythCalculatedRandom = event.args.randomNumber; 

                  console.log(`[${toolName}]   Event Details:`);
                  console.log(`[${toolName}]     SequenceNumber: ${event.args.request.sequenceNumber.toString()}`);
                  console.log(`[${toolName}]     Requester (DiceRoller): ${event.args.request.requester}`);
                  console.log(`[${toolName}]     Commitment (U_client from event): ${eventCommitment}`);
                  console.log(`[${toolName}]     UserRandomForXOR (U_event by Pyth): ${eventUserRandomForXOR}`);
                  console.log(`[${toolName}]     ProviderRevelation (P_event): ${eventProviderRevelation}`);
                  console.log(`[${toolName}]     Pyth's Calculated Random (U_event ^ P_event): ${eventPythCalculatedRandom}`);

                  if (eventCommitment.toLowerCase() !== userRandomHex.toLowerCase() || eventUserRandomForXOR.toLowerCase() !== userRandomHex.toLowerCase()) {
                      console.warn(`[${toolName}] Warning: Mismatch in random seeds! Our U_client: ${userRandomHex}. Event commitment: ${eventCommitment}. Event userRandomForXOR: ${eventUserRandomForXOR}. This is highly unusual.`);
                  }
                  
                  resolve(eventProviderRevelation); 
                  return; 
                }
              }
              polledBlockNumber = currentBlockOnChain + 1;
              setTimeout(poll, pollingInterval);

            } catch (pollError) {
              console.warn(`[${toolName}] Warning during polling for RevealedWithCallback event (will retry): ${pollError.message}`);
              setTimeout(poll, pollingInterval);
            }
          };
          poll(); 
        });
      } catch (error) {
        console.error(`[${toolName}] Failed to get providerRevelation from Pyth's RevealedWithCallback event:`, error.message);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `⚠️ Failed to get Pyth provider's revelation: ${error.message}. This could be a timeout or network issue.`);
        throw new Error(`[${toolName}] Failed to get providerRevelation: ${error.message}`);
      }

      if (!providerRevelationHex) { 
        const errorMsg = "Polling completed, but providerRevelationHex was not obtained from Pyth. This is unexpected.";
        console.error(`[${toolName}] ${errorMsg}`);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `⚠️ ${errorMsg}`);
        throw new Error(`[${toolName}] ${errorMsg}`);
      }
      if (client && userId) await client.sendMessage(`${userId}@c.us`, `✨ Pyth provider has revealed their number! Now combining numbers securely to get the final random result...`);

      // 4: XORing client-side random seed (U_client) with provider's revelation (P_event) 
      console.log(`[${toolName}] Step 4: Combining client's seed (U_client) with provider's revelation (P_event) using XOR...`);
      console.log(`[${toolName}]    Client's userRandomHex (U_client): ${userRandomHex}`);
      console.log(`[${toolName}]    Provider's revelationHex (P_event): ${providerRevelationHex}`);
      
      const providerRevelationBytes = ethers.getBytes(providerRevelationHex); 
      if (userRandomBytes.length !== providerRevelationBytes.length) {
        const errorMsg = `Critical Error: Mismatch in byte lengths for XOR operation. Client seed: ${userRandomBytes.length} bytes, Provider revelation: ${providerRevelationBytes.length} bytes. Cannot proceed.`;
        console.error(`[${toolName}] ${errorMsg}`);
        if (client && userId) await client.sendMessage(`${userId}@c.us`, `⚠️ Internal error: ${errorMsg}`);
        throw new Error(`[${toolName}] ${errorMsg}`);
      }

      const finalCombinedRandomBytes = new Uint8Array(userRandomBytes.length);
      for (let i = 0; i < userRandomBytes.length; i++) {
        finalCombinedRandomBytes[i] = userRandomBytes[i] ^ providerRevelationBytes[i];
      }
      const finalCombinedRandomHex = ethers.hexlify(finalCombinedRandomBytes);
      console.log(`[${toolName}]    XORed Result (U_client ^ P_event): ${finalCombinedRandomHex}`);

      // 5: final XORed random number for dice rolls
      console.log(`[${toolName}] Step 5: Processing final XORed random number (${finalCombinedRandomHex}) for dice rolls...`);
      if (client && userId) await client.sendMessage(`${userId}@c.us`, `🎲 Generated final random number. Rolling your dice based on this secure result!`);

      const randomBytesToUseForRolls = finalCombinedRandomBytes; 
      const results = [];
      let byteOffset = 0;
      let overallSuccess = true;

      for (const req of parsedDiceRequests) {
        const rolls = [];
        for (let i = 0; i < req.count; i++) {
          if (byteOffset + 1 >= randomBytesToUseForRolls.length) {
             const criticalErrorMsg = `CRITICAL: Ran out of random bytes unexpectedly. Offset: ${byteOffset}, Length: ${randomBytesToUseForRolls.length}. Request: ${req.original}. This indicates an issue with prior checks or random data length.`;
             console.error(`[${toolName}] ${criticalErrorMsg}`);
             if (client && userId) await client.sendMessage(`${userId}@c.us`, `⚠️ Internal error during rolling: ${criticalErrorMsg}`);
             rolls.push('ERROR');
             overallSuccess = false;
             break; 
          }
          
          const highByte = randomBytesToUseForRolls[byteOffset];
          const lowByte = randomBytesToUseForRolls[byteOffset + 1];
          const sliceValue = (highByte << 8) | lowByte; 
          
          const dieRoll = (sliceValue % req.sides) + 1; 
          rolls.push(dieRoll);
          
          byteOffset += 2; 
        }
        results.push({ request: req.original, rolls });
        if (!overallSuccess) break; 
      }

      if (!overallSuccess) {
        const errorMsg = "Errors occurred during the dice rolling phase due to insufficient random data or other internal issue.";
        console.error(`[${toolName}] ${errorMsg}`);
        return { text: errorMsg };
      }

      let resultMessage = "🎉 Pyth Entropy Dice Roll Results (Sanko Testnet):\n";
      results.forEach(res => {
        resultMessage += `   ${res.request}: ${res.rolls.join(', ')}\n`;
      });
      resultMessage += "\nRandomness securely generated using Pyth Network's Entropy service. Each roll is verifiably random!";

      if (client && userId) await client.sendMessage(`${userId}@c.us`, resultMessage);
      console.log(`[${toolName}] Successfully completed dice rolls. Results: ${JSON.stringify(results)}`);
      return { text: resultMessage };

    } catch (error) {
      console.error(`[${toolName}] Critical error during dice rolling process:`, error);
      const finalErrorMsg = `⚠️ An unexpected error occurred while rolling the dice with Pyth Entropy: ${error.message}. If this persists, please contact support.`;
      
      // dont sendg duplicate/generic error messages
      const knownErrorSubstrings = [
        "Configuration error", "fetching fee", "requestRandomNumber transaction",
        "SequenceNumber", "providerRevelation", "XOR operation", "Ran out of random bytes"
      ];
      let alreadySentSpecificError = false;
      for (const sub of knownErrorSubstrings) {
        if (error.message && error.message.includes(sub)) {
          alreadySentSpecificError = true;
          break;
        }
      }

      if (client && userId && !alreadySentSpecificError) {
        try {
          await client.sendMessage(`${userId}@c.us`, finalErrorMsg);
        } catch (sendError) {
          console.error(`[${toolName}] Failed to send final critical error message to user:`, sendError);
        }
      }
      throw new Error(`[${toolName}] ${error.message || 'An unknown error occurred in Pyth Dice Roller.'}`);
    }
  }
};
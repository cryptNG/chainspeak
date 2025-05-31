require('dotenv').config({ path: '.env.local' });
const ethers = require('ethers');

const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
const entropyContractAddress = process.env.PYTH_SANKO_TESTNET_ENTROPY_CONTRACT_ADDRESS;
const rpcUrl = process.env.PYTH_SANKO_TESTNET_RPC_URL;
const defaultProviderAddress = process.env.PYTH_SANKO_DEFAULT_PROVIDER_ADDRESS;
const diceRollerContractAddress = process.env.PYTH_SANKO_RANDOM_NUMBER_CONTRACT;

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
  ,
  { 
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "provider",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "sequenceNumber",
            "type": "uint64"
          },
          {
            "internalType": "uint32",
            "name": "numHashes",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "commitment",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "blockNumber",
            "type": "uint64"
          },
          {
            "internalType": "address",
            "name": "requester", // This field is important
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "useBlockhash",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isRequestWithCallback",
            "type": "bool"
          }
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
  }
  ,
  { 
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "provider",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "sequenceNumber",
            "type": "uint64"
          },
          {
            "internalType": "uint32",
            "name": "numHashes",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "commitment", 
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "blockNumber",
            "type": "uint64"
          },
          {
            "internalType": "address",
            "name": "requester", 
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "useBlockhash",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isRequestWithCallback",
            "type": "bool"
          }
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

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(walletPrivateKey, provider);
const diceRollerContract = new ethers.Contract(diceRollerContractAddress, diceRollerAbi, wallet);
const entropyContract = new ethers.Contract(entropyContractAddress, iEntropyAbi, provider);

function parseDiceStrings(diceStrings) {
  const parsedRequests = [];
  for (const str of diceStrings) {
    const parts = str.toLowerCase().split('d');
    if (parts.length === 2) {
      const count = parseInt(parts[0], 10);
      const sides = parseInt(parts[1], 10);
      if (!isNaN(count) && !isNaN(sides) && count > 0 && sides > 0) {
        parsedRequests.push({ count, sides, original: str });
      } else {
        console.warn(`Invalid dice string format: ${str}`);
      }
    } else {
      console.warn(`Invalid dice string format: ${str}`);
    }
  }
  return parsedRequests;
}

async function simulateDiceRolls(diceRequestsStr) {
  if (!walletPrivateKey || !entropyContractAddress || !rpcUrl || !defaultProviderAddress || !diceRollerContractAddress) {
    console.error("Missing one or more environment variables. Please check .env.local");
    return [];
  }

  console.log("Parsing dice strings...");
  const parsedDiceRequests = parseDiceStrings(diceRequestsStr);
  if (parsedDiceRequests.length === 0) {
    console.log("No valid dice requests to process.");
    return [];
  }

  let totalIndividualRolls = 0;
  parsedDiceRequests.forEach(req => totalIndividualRolls += req.count);
  console.log(`Total individual dice rolls needed: ${totalIndividualRolls}`);

  if (totalIndividualRolls * 2 > 32) { 
    console.error(`Too many dice rolls requested (${totalIndividualRolls}). Max 16 individual rolls with this method per single random number. Requested: ${totalIndividualRolls} rolls.`);
    return [];
  }

  console.log("\nStep 1: Generate client-side random number (user commitment seed).");
  const userRandomBytes = ethers.randomBytes(32); 
  const userRandomHex = ethers.hexlify(userRandomBytes); 
  console.log(`User random seed (U_client): ${userRandomHex}`);

  console.log("\nStep 2: Request a random number from Entropy via our DiceRollerContract.");
  let fee;
  try {
    fee = await entropyContract.getFee(defaultProviderAddress);
    console.log(`Fee for Pyth Entropy request (default provider): ${ethers.formatEther(fee)} native tokens`);
  } catch (error) {
    console.error("Error fetching fee from Entropy contract:", error);
    return [];
  }

  let tx, receipt;
  try {
    console.log(`Sending requestRandomNumber to DiceRollerContract (${diceRollerContractAddress}) with user seed ${userRandomHex}...`);
    tx = await diceRollerContract.requestRandomNumber(userRandomHex, { value: fee });
    console.log(`Transaction sent: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");
    receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error("An error occurred during the requestRandomNumber transaction:", error);
    if (error.info && error.info.error && error.info.error.message) {
        console.error("Revert reason (from error.info):", error.info.error.message);
    } else if (error.data) {
        console.error("Revert reason (from error.data):", error.data);
    } else if (error.message) {
        console.error("Error message:", error.message);
    }
    return [];
  }

  let sequenceNumber = null;
  const requestEventName = "RandomNumberRequest";
  for (const log of receipt.logs) {
      if (log.address.toLowerCase() === diceRollerContractAddress.toLowerCase()) {
          try {
              const parsedLog = diceRollerContract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === requestEventName) {
                  sequenceNumber = parsedLog.args.sequenceNumber;
                  console.log(`Found ${requestEventName} event with sequenceNumber: ${sequenceNumber.toString()}`);
                  break;
              }
          } catch (e) { }
      }
  }
  
  if (sequenceNumber === null) {
    console.error("Could not find sequence number from RandomNumberRequest event in transaction logs.");
    return [];
  }
  console.log(`Sequence Number for waiting: ${sequenceNumber.toString()}`);

  console.log("\nStep 3: Wait for the provider's revelation to be emitted by the Entropy contract.");
  let providerRevelationHex; 
  const pollingInterval = 5000; 
  const timeoutDuration = 180000;
  const startTime = Date.now();
  let polledBlockNumber = receipt.blockNumber; 

  try {
    providerRevelationHex = await new Promise(async (resolve, reject) => {
      const poll = async () => {
        if (Date.now() - startTime > timeoutDuration) {
          reject(new Error(`Timed out waiting for RevealedWithCallback for sequence ${sequenceNumber.toString()} (requester: ${diceRollerContractAddress}) after ${timeoutDuration/1000}s`));
          return;
        }

        try {
          const currentBlock = await provider.getBlockNumber();
          if (polledBlockNumber > currentBlock) {
            setTimeout(poll, pollingInterval);
            return;
          }
          
          const resultEventFilter = entropyContract.filters.RevealedWithCallback(); 
          const events = await entropyContract.queryFilter(resultEventFilter, polledBlockNumber, currentBlock);

          for (const event of events) {
            if (event.args && 
                event.args.request && 
                event.args.request.requester && 
                event.args.request.requester.toLowerCase() === diceRollerContractAddress.toLowerCase() && 
                event.args.request.sequenceNumber !== undefined && 
                event.args.request.sequenceNumber.toString() === sequenceNumber.toString()) {
              
              console.log(`Found RevealedWithCallback event on Entropy contract (address: ${entropyContractAddress})`);
              const eventUserRandom = event.args.userRandomNumber; 
              const eventProviderRevelation = event.args.providerRevelation; 
              const eventPythCalculatedRandom = event.args.randomNumber; 

              console.log(`  Event sequenceNumber: ${event.args.request.sequenceNumber.toString()}`);
              console.log(`  Event requester: ${event.args.request.requester}`);
              console.log(`  Event userRandomNumber (U_event from Pyth): ${eventUserRandom}`);
              console.log(`  Event providerRevelation (P_event): ${eventProviderRevelation}`);
              console.log(`  Event randomNumber (Pyth's U_event ^ P_event): ${eventPythCalculatedRandom}`);

              if (eventUserRandom.toLowerCase() !== userRandomHex.toLowerCase()) {
                  console.warn(`Warning: Event's userRandomNumber (${eventUserRandom}) does not match client's initially sent userRandomHex (${userRandomHex}). This might indicate an unexpected state or misconfiguration if they are supposed to be identical. Proceeding with event's providerRevelation.`);
              }
              
              resolve(eventProviderRevelation); 
              return; 
            }
          }

          polledBlockNumber = currentBlock + 1;
          setTimeout(poll, pollingInterval);

        } catch (pollError) {
          console.warn(`Warning during polling for RevealedWithCallback event (will retry): ${pollError.message}`);
          setTimeout(poll, pollingInterval);
        }
      };
      poll();
    });
  } catch (error) { 
    console.error("Failed to get providerRevelation from RevealedWithCallback event:", error.message);
    return [];
  }

  if (!providerRevelationHex) {
    console.error("Polling completed but providerRevelationHex was not obtained.");
    return [];
  }

  console.log(`\nStep 4: Combine client-side random seed (U_client) with provider's revelation (P_event) using XOR.`);
  console.log(`   Client's userRandomHex (U_client): ${userRandomHex}`);
  console.log(`   Provider's revelationHex (P_event): ${providerRevelationHex}`);
  
  const providerRevelationBytes = ethers.getBytes(providerRevelationHex);

  if (userRandomBytes.length !== providerRevelationBytes.length) {
    console.error(`Critical Error: Mismatch in byte lengths for XOR. User: ${userRandomBytes.length}, Provider: ${providerRevelationBytes.length}. Cannot proceed.`);
    return [];
  }

  const finalCombinedRandomBytes = new Uint8Array(userRandomBytes.length);
  for (let i = 0; i < userRandomBytes.length; i++) {
    finalCombinedRandomBytes[i] = userRandomBytes[i] ^ providerRevelationBytes[i];
  }
  const finalCombinedRandomHex = ethers.hexlify(finalCombinedRandomBytes);
  console.log(`   XORed Result (U_client ^ P_event): ${finalCombinedRandomHex}`);

  console.log(`\nStep 5: Process final XORed random number (${finalCombinedRandomHex}) for dice rolls.`);

  const randomBytesToUseForRolls = finalCombinedRandomBytes;
  const results = [];
  let byteOffset = 0;

  for (const req of parsedDiceRequests) {
    const rolls = [];
    for (let i = 0; i < req.count; i++) {
      if (byteOffset + 1 >= randomBytesToUseForRolls.length) {
         console.warn(`Not enough unique random bytes for all rolls. Wrapping around random data. Request: ${req.original}, roll number ${i+1} of ${req.count}. Byte offset: ${byteOffset} -> 0`);
         byteOffset = 0; 
        
         
         if (byteOffset + 1 >= randomBytesToUseForRolls.length) {
             console.error(`CRITICAL: Random data (length ${randomBytesToUseForRolls.length}) too short even after wrap-around. Cannot perform roll for ${req.original}.`);
             rolls.push(-1); 
             break; 
         }
      }
      
      const highByte = randomBytesToUseForRolls[byteOffset];
      const lowByte = randomBytesToUseForRolls[byteOffset + 1];
      const sliceValue = (highByte << 8) | lowByte; //bytes to 16bit number
      
      const dieRoll = (sliceValue % req.sides) + 1;
      rolls.push(dieRoll);
      
      byteOffset += 2; //nove to the next pair of bytes
    }
    results.push({ request: req.original, rolls });
    if (rolls.includes(-1)) break;
  }
  if (results.some(r => r.rolls.includes(-1))) {
      console.error("Errors occurred during dice rolling due to insufficient random data.");
  }

  return results;
}


async function main() {
  console.log("Starting Pyth Entropy Dice Roller Simulation...");

  const testCases = [
    ["1d6"],
    ["3d4", "2d8", "1d12"],
    ["8d6"], 
    
  ];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n--- Running Test Case ${i + 1}: ${testCases[i].join(', ')} ---`);
    const results = await simulateDiceRolls(testCases[i]);
    if (results && results.length > 0) {
      console.log("\n--- Final Dice Roll Results for Test Case ---");
      results.forEach(res => {
        console.log(`${res.request}: ${res.rolls.join(', ')}`);
      });
    } else {
      console.log("Test case did not produce results or encountered an error.");
    }
    if (i < testCases.length - 1) {
      console.log("\nWaiting a few seconds before next test case...");
      await new Promise(resolve => setTimeout(resolve, 15000)); 
    }
  }

  console.log("\nSimulation finished.");
}

main().catch(error => {
  console.error("Unhandled error in main function:", error);
});
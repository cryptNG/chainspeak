// index.js
require('dotenv').config({ path: '.env.local' });
const ethers = require('ethers');

// Environment variables
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
const entropyContractAddress = process.env.PYTH_KAI_TESTNET_ENTROPY_CONTRACT_ADDRESS;
const rpcUrl = process.env.PYTH_KAI_TESTNET_RPC_URL;
const defaultProviderAddress = process.env.PYTH_KAI_DEFAULT_PROVIDER_ADDRESS;
const diceRollerContractAddress = process.env.PYTH_KAI_RANDOM_NUMBER_CONTRACT;

// ABI for the deployed DiceRoller contract
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

// ABI for Pyth IEntropy contract (only getFee/getDefaultProvider)
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
];

// Setup Ethers
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(walletPrivateKey, provider);
const diceRollerContract = new ethers.Contract(diceRollerContractAddress, diceRollerAbi, wallet);
const entropyContract = new ethers.Contract(entropyContractAddress, iEntropyAbi, provider);

/**
 * Parses dice strings like "1d3", "2d10" into structured objects.
 * @param {string[]} diceStrings - Array of dice strings.
 * @returns {Array<{count: number, sides: number, original: string}>} Parsed dice requests.
 */
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

/**
 * Simulates dice rolls using Pyth Entropy.
 * @param {string[]} diceRequestsStr - Array of dice strings, e.g., ["1d3", "2d10"].
 * @returns {Promise<Array<{request: string, rolls: number[]}>>} Array of results per request.
 */
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

  if (totalIndividualRolls * 2 > 32) { // Each roll uses 2 bytes (16 bits) from the 32-byte random number
    console.error(`Too many dice rolls requested (${totalIndividualRolls}). Max 16 individual rolls with this method per single random number. Requested: ${totalIndividualRolls} rolls.`);
    return [];
  }

  console.log("\nStep 1: Generate client-side random number (user commitment).");
  const userRandomBytes = ethers.randomBytes(32);
  const userRandomHex = ethers.hexlify(userRandomBytes);
  console.log(`User random (commitment): ${userRandomHex}`);

  console.log("\nStep 2: Request a random number from Entropy via our DiceRollerContract.");
  let fee;
  try {
    fee = await entropyContract.connect(wallet).getFee(defaultProviderAddress);
    console.log(`Fee for Pyth Entropy request (default provider): ${ethers.formatEther(fee)} native tokens`);
  } catch (error) {
    console.error("Error fetching fee from Entropy contract:", error);
    return [];
  }

  let tx, receipt;
  try {
    console.log(`Sending requestRandomNumber to DiceRollerContract (${diceRollerContractAddress})...`);
    tx = await diceRollerContract.requestRandomNumber(userRandomHex, { value: fee });
    console.log(`Transaction sent: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");
    receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error("An error occurred during the requestRandomNumber transaction:", error);
    // Attempt to extract more detailed error information
    if (error.info && error.info.error && error.info.error.message) { // Ethers v6 style error
        console.error("Revert reason (from error.info):", error.info.error.message);
    } else if (error.data) { // Ethers v5 style error (or other RPCs)
        console.error("Revert reason (from error.data):", error.data);
    } else if (error.message) {
        console.error("Error message:", error.message);
    }
    return [];
  }

  // Parse out sequenceNumber from RandomNumberRequest event
  let sequenceNumber = null;
  const requestEventName = "RandomNumberRequest";
  for (const log of receipt.logs) {
      if (log.address.toLowerCase() === diceRollerContractAddress.toLowerCase()) {
          try {
              const parsedLog = diceRollerContract.interface.parseLog(log); // 'log' from receipt.logs is suitable
              if (parsedLog && parsedLog.name === requestEventName) {
                  sequenceNumber = parsedLog.args.sequenceNumber; // This will be a BigInt for uint64
                  console.log(`Found ${requestEventName} event with sequenceNumber: ${sequenceNumber.toString()}`);
                  break;
              }
          } catch (e) {
              // This log was not from this contract's ABI or not the event we are looking for
          }
      }
  }
  
  // Ensure sequenceNumber was found (it could be 0, which is valid)
  if (sequenceNumber === null) {
    console.error("Could not find sequence number from RandomNumberRequest event in transaction logs.");
    return [];
  }
  console.log(`Sequence Number for waiting: ${sequenceNumber.toString()}`);

  // Wait for RandomNumberResult event by polling
  console.log("Waiting for on-chain RandomNumberResult by polling...");
  let rawRandomNumber;
  const pollingInterval = 5000; // 5 seconds
  const timeoutDuration = 120000; // 2 minutes (120,000 ms)
  const startTime = Date.now();
  // Start polling from the block where the request was confirmed.
  // The callback transaction (emitting RandomNumberResult) will be in this block or a later one.
  let polledBlockNumber = receipt.blockNumber; 

  try {
    rawRandomNumber = await new Promise(async (resolve, reject) => {
      const poll = async () => {
        if (Date.now() - startTime > timeoutDuration) {
          reject(new Error(`Timed out waiting for RandomNumberResult for sequence ${sequenceNumber.toString()} (polling after ${timeoutDuration/1000}s)`));
          return;
        }

        try {
          const currentBlock = await provider.getBlockNumber();
          // console.log(`Polling for RandomNumberResult event for sequence ${sequenceNumber.toString()} from block ${polledBlockNumber} to ${currentBlock}`);

          // Ensure fromBlock is not greater than toBlock; if so, wait for new blocks.
          if (polledBlockNumber > currentBlock) {
            // console.log(`Polled block number (${polledBlockNumber}) is ahead of current block (${currentBlock}). Waiting for new blocks...`);
            setTimeout(poll, pollingInterval);
            return;
          }
          
          // Define the filter for RandomNumberResult event.
          // We cannot filter by non-indexed sequenceNumber on RPC side, so we fetch all events of this type and filter client-side.
          const resultEventFilter = diceRollerContract.filters.RandomNumberResult(); 
          const events = await diceRollerContract.queryFilter(resultEventFilter, polledBlockNumber, currentBlock);

          for (const event of events) {
            // event.args.sequenceNumber will be a BigInt. Compare its string representation.
            if (event.args && event.args.sequenceNumber !== undefined && event.args.sequenceNumber.toString() === sequenceNumber.toString()) {
              console.log(`Found RandomNumberResult event for sequence ${sequenceNumber.toString()}: randomNumber ${event.args.randomNumber}`);
              resolve(event.args.randomNumber);
              return; // Exit poll loop
            }
          }

          // If not found, prepare for the next poll.
          // Advance polledBlockNumber to avoid re-scanning already checked blocks.
          polledBlockNumber = currentBlock + 1;
          setTimeout(poll, pollingInterval);

        } catch (pollError) {
          console.error("Error during polling for RandomNumberResult event:", pollError.message);
          // Don't reject immediately on a poll error, could be a temporary RPC issue.
          // Let the main timeout handle persistent failures.
          // Wait for the standard interval before trying again.
          setTimeout(poll, pollingInterval);
        }
      };
      poll(); // Start polling
    });
  } catch (error) {
    console.error(error); // This will catch the timeout error or any unexpected errors from the Promise setup
    return [];
  }

  console.log(`Got randomNumber (bytes32): ${rawRandomNumber}`);

  // Slice the bytes32 into individual dice rolls (16 bits / 2 bytes each)
  const randomBytesArr = ethers.getBytes(rawRandomNumber); // Uint8Array, length 32
  const results = [];
  let byteOffset = 0; // Current position in randomBytesArr

  for (const req of parsedDiceRequests) {
    const rolls = [];
    for (let i = 0; i < req.count; i++) {
      // Check if there are enough bytes for the current roll (2 bytes needed)
      if (byteOffset + 1 >= randomBytesArr.length) {
         console.warn(`Not enough unique random bytes for all rolls. Wrapping around random data. Request: ${req.original}, roll number ${i+1} of ${req.count}. Total rolls processed: ${results.reduce((acc, r) => acc + r.rolls.length, 0) + rolls.length}. Byte offset: ${byteOffset}`);
         byteOffset = 0; // Wrap around to the beginning of randomBytesArr
      }
      
      const highByte = randomBytesArr[byteOffset];
      const lowByte = randomBytesArr[byteOffset + 1];
      // Combine two 8-bit bytes into one 16-bit number (0-65535)
      const sliceValue = (highByte << 8) | lowByte; 
      
      const dieRoll = (sliceValue % req.sides) + 1;
      rolls.push(dieRoll);
      
      byteOffset += 2; // Advance offset by 2 bytes for the next roll
    }
    results.push({ request: req.original, rolls });
  }

  return results;
}


/**
 * Main function to run example dice rolls.
 */
async function main() {
  console.log("Starting Pyth Entropy Dice Roller Simulation...");

  const testCases = [
    ["1d6"],
    // ["3d4", "2d8", "1d12"], // Uncomment to run more cases
    // ["8d6"], // Example for 8 rolls (16 bytes)
    // ["16d20"], // Example for 16 rolls (32 bytes)
    // ["17d6"] // This would trigger the wrap-around warning for random data usage
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
      console.log("Test case did not produce results or was skipped due to an error.");
    }
    if (i < testCases.length - 1) {
      console.log("\nWaiting a few seconds before next test case...");
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15-second delay
    }
  }

  console.log("\nSimulation finished.");
}

main().catch(error => {
  console.error("Unhandled error in main function:", error);
});
// index.js
require('dotenv').config({ path: '.env.local' });
const ethers = require('ethers'); // Corrected import for ethers

// Environment variables
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
const entropyContractAddress = process.env.PYTH_SANKO_TESTNET_ENTROPY_CONTRACT_ADDRESS;
const rpcUrl = process.env.PYTH_SANKO_TESTNET_RPC_URL;
const defaultProviderAddress = process.env.PYTH_SANKO_DEFAULT_PROVIDER_ADDRESS;
const diceRollerContractAddress = process.env.PYTH_SANKO_RANDOM_NUMBER_CONTRACT;

// ABI for the deployed DiceRoller contract (PYTH_SANKO_RANDOM_NUMBER_CONTRACT)
// This ABI includes the 'randomResults' getter, assuming your contract has:
// mapping(uint64 => bytes32) public randomResults;
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
    }
  ];

// ABI for Pyth IEntropy contract (partial, only what's needed)
const iEntropyAbi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint64", "name": "sequenceNumber", "type": "uint64" },
      { "indexed": true, "internalType": "address", "name": "requester", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "provider", "type": "address" },
      { "indexed": false, "internalType": "bytes32", "name": "userCommitment", "type": "bytes32" }
    ],
    "name": "RequestedWithCallback",
    "type": "event"
  },
  {
    "inputs": [ { "internalType": "address", "name": "provider", "type": "address" } ],
    "name": "getFee",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [],
    "name": "getDefaultProvider",
    "outputs": [ { "internalType": "address", "name": "", "type": "address" } ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Setup Ethers
const provider = new ethers.JsonRpcProvider(rpcUrl); // Ethers v6: No '.providers'
const wallet = new ethers.Wallet(walletPrivateKey, provider); // Ethers v6: Wallet is top-level

const diceRollerContract = new ethers.Contract(diceRollerContractAddress, diceRollerAbi, wallet);
console.log("diceRollerContract"+ JSON.stringify(diceRollerContract));
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
 */
async function simulateDiceRolls(diceRequestsStr) {
    if (!walletPrivateKey || !entropyContractAddress || !rpcUrl || !defaultProviderAddress || !diceRollerContractAddress) {
        console.error("Missing one or more environment variables. Please check .env.local");
        return;
    }

    console.log("Parsing dice strings...");
    const parsedDiceRequests = parseDiceStrings(diceRequestsStr);
    if (parsedDiceRequests.length === 0) {
        console.log("No valid dice requests to process.");
        return;
    }

    let totalIndividualRolls = 0;
    parsedDiceRequests.forEach(req => totalIndividualRolls += req.count);
    console.log(`Total individual dice rolls needed: ${totalIndividualRolls}`);

    if (totalIndividualRolls * 2 > 32) {
        console.error(`Too many dice rolls requested (${totalIndividualRolls}). Max ~16 individual rolls with this method per single random number.`);
        return;
    }

    console.log("\nStep 1: Generate client-side random number (user commitment).");
    const userRandomBytes = ethers.randomBytes(32); // Ethers v6: randomBytes is top-level
    const userRandomHex = ethers.hexlify(userRandomBytes); // Ethers v6: hexlify is top-level
    console.log(`User random (commitment): ${userRandomHex}`);

    console.log("\nStep 2: Request a random number from Entropy via our DiceRollerContract.");
    let fee;
    try {
        fee = await entropyContract.connect(wallet).getFee(defaultProviderAddress);
        console.log(`Fee for Pyth Entropy request (default provider): ${ethers.formatEther(fee)} native tokens`); // Ethers v6: formatEther is top-level
    } catch (error) {
        console.error("Error fetching fee from Entropy contract:", error);
        return;
    }

    let tx;
    try {
        console.log(`Sending requestRandomNumber to DiceRollerContract (${diceRollerContractAddress})...`);
        tx = await diceRollerContract.requestRandomNumber(userRandomHex, { value: fee });
        console.log(`Transaction sent: ${tx.hash}`);
        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

        const eventInterface = new ethers.Interface(diceRollerAbi); // Ethers v6: Interface is top-level
        let sequenceNumber = null;
        console.log(
            "++++++++"
        );

        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === diceRollerContractAddress.toLowerCase()) {
                        
                try {
                    const parsedLog = eventInterface.parseLog(log);
                  
                    if (parsedLog?.name === "RandomNumberRequest") {
                        console.debug(parsedLog);
                       sequenceNumber = parsedLog.args[0];
                    }
                } catch (e) {
                  console.log("error",e);
                }
            }
        }
        
        if (!sequenceNumber) {
            console.error("Could not find sequence number from RandomNumberRequest event in transaction logs.");
            return;
        }

        





    } catch (error) {
        console.error("An error occurred during the dice roll simulation:", error);
        if (error.data) { 
            console.error("Revert reason (if available):", error.data);
        } else if (error.transaction) {
             console.error("Transaction details:", error.transaction);
        }
    }
}

/**
 * Main function to run example dice rolls.
 */
async function main() {
    console.log("Starting Pyth Entropy Dice Roller Simulation...");

    const testCases = [
        ["1d6"],
        ["2d10", "1d20"],
        // ["3d4", "2d8", "1d12"] // Commenting out longer test for quicker run if needed
    ];
    
    // const specificTest = ["1d3", "2d10"]; 
    // const results = await simulateDiceRolls(specificTest);
    // if (results) {
    //     console.log("\n--- Final Dice Roll Results ---");
    //     results.forEach(res => {
    //         console.log(`${res.request}: ${res.rolls.join(', ')}`);
    //     });
    // }


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
        if (i < testCases.length -1) {
            console.log("\nWaiting a few seconds before next test case...");
            await new Promise(resolve => setTimeout(resolve, 15000)); // Increased delay for testnets
        }
    }

    console.log("\nSimulation finished.");
}

main().catch(error => {
    console.error("Unhandled error in main function:", error);
});
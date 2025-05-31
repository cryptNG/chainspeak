// interact.js
require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

const rpcUrl = process.env.ROOTSTOCK_RPC_URL;
const privateKey = process.env.WALLET_PRIVATE_KEY; //will normally be retrieved from the ai
const contractAddress = process.env.ROOTSTOCK_CONTRACT_ADDRESS;

if (!rpcUrl || !privateKey || !contractAddress) {
    console.error("Error: Missing required environment variables (ROOTSTOCK_RPC_URL, WALLET_PRIVATE_KEY, ROOTSTOCK_CONTRACT_ADDRESS).");
    console.log("Please create a .env.local file with these values: \nROOTSTOCK_RPC_URL=your_rpc_url\nWALLET_PRIVATE_KEY=your_private_key\nROOTSTOCK_CONTRACT_ADDRESS=your_contract_address");
    process.exit(1);
}

// minimal ABI for the functions we want to interact with, from the contract compilation output
const contractAbi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "bag",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "bagSize",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "item",
          "type": "string"
        }
      ],
      "name": "drop",
      "outputs": [
        {
          "internalType": "bool",
          "name": "success",
          "type": "bool"
        },
        {
          "internalType": "string",
          "name": "message",
          "type": "string"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "dirName",
          "type": "string"
        }
      ],
      "name": "go",
      "outputs": [
        {
          "internalType": "bool",
          "name": "moved",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "reachedExit",
          "type": "bool"
        },
        {
          "internalType": "string",
          "name": "message",
          "type": "string"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "item",
          "type": "string"
        }
      ],
      "name": "grab",
      "outputs": [
        {
          "internalType": "bool",
          "name": "success",
          "type": "bool"
        },
        {
          "internalType": "string",
          "name": "message",
          "type": "string"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "look",
      "outputs": [
        {
          "internalType": "string",
          "name": "roomName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "exits",
          "type": "string[]"
        },
        {
          "internalType": "string[]",
          "name": "items",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "newGame",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

// Helper for Direction enum (matches Solidity if it had one)
const Direction = {
    North: 0,
    East: 1,
    South: 2,
    West: 3
};
const DirectionNames = ["North", "East", "South", "West"]; // For converting enum to string

// Helper function to parse revert reasons from errors
function parseRevertReason(error, contractInterface) {
    // 1. Ethers.js `error.reason` (often the most direct decoded string)
    if (error.reason) {
        return error.reason;
    }

    let rawDataHex;

    // 2. Check for the specific error structure (INVALID_ARGUMENT with data in error.value)
    // This was observed in the user's log for this specific contract/RPC combination.
    if (error.code === 'INVALID_ARGUMENT' && error.value && typeof error.value === 'object' && error.value.data && typeof error.value.data === 'string' && error.value.data.startsWith('0x')) {
        rawDataHex = error.value.data;
    }
    // 3. Standard Ethers.js `error.data` (common for contract reverts if not in error.value.data)
    else if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
        rawDataHex = error.data;
    }
    // 4. Check for info.error.data (nested RPC errors, e.g. from Infura or Alchemy)
    else if (error.info && error.info.error && error.info.error.data && typeof error.info.error.data === 'string' && error.info.error.data.startsWith('0x')) {
        rawDataHex = error.info.error.data;
    }

    if (rawDataHex) {
        try {
            const decodedError = contractInterface.parseError(rawDataHex);
            if (decodedError) {
                // For standard Error(string) or custom errors with string arguments as the first arg
                if (decodedError.args && decodedError.args.length > 0 && typeof decodedError.args[0] === 'string') {
                    return decodedError.args[0]; // E.g., "Need Key" from Error("Need Key")
                }
                return decodedError.name; // E.g., "CustomErrorName" if no string arg
            }
            return `Could not parse revert data hex: ${rawDataHex}`;
        } catch (e) {
            return `Failed to parse revert data hex ${rawDataHex}: ${e.message}`;
        }
    }
    
    // 5. Fallback to trying to extract reason from error.message string patterns
    if (error.message) {
        const patterns = [
            /reason="([^"]+)"/, // ethers v6 error formatting for some cases
            /reverted with reason string '([^']+)'/, // geth style
            /execution reverted(?::\s*([^.,]*))?/, // general, captures optional reason after colon
            /VM Exception while processing transaction: revert(?:ed)?\s*([^.]+)\.?/, // Ganache/Hardhat
            /"message":\s*"execution reverted: ([^"]+)"/, // JSON RPC error message with revert
            /custom error\s*([A-Za-z0-9_]+)/, // Looks for "custom error NAME"
        ];
        for (const pattern of patterns) {
            const match = error.message.match(pattern);
            if (match && match[1] && match[1].trim() !== "") {
                return match[1].trim();
            } else if (match && pattern.source.includes("custom error") && match[1]) { // For custom error name
                 return match[1].trim();
            }
        }
        // If it's a known error code from ethers, it might be more descriptive
        if(error.code && error.code !== 'UNKNOWN_ERROR') { // UNKNOWN_ERROR is too generic
            return `${error.code} (details: ${error.message})`;
        }
        return error.message; // Fallback to the full message
    }
    
    return "Unknown error occurred"; // Ultimate fallback
}


// Interaction Fns
async function callNewGame() {
    console.log("\n--- Calling newGame() ---");
    try {
        const tx = await contract.newGame();
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("newGame() successful! Your game state has been reset.");
    } catch (error) {
        const reason = parseRevertReason(error, contract.interface);
        console.error("Error calling newGame():", reason);
    }
}

async function callLook() {
    console.log("\n--- Calling look() ---");
    try {
        const result = await contract.look(); // Ethers.js v6 returns an object for named outputs
        console.log("Room Name:", result.roomName);
        console.log("Description:", result.description);
        console.log("Exits:", result.exits);
        console.log("Items in room:", result.items);
        return result;
    } catch (error) {
        const reason = parseRevertReason(error, contract.interface);
        console.error("Error calling look():", reason);
        return null;
    }
}

async function callBag() {
    console.log("\n--- Calling bag() ---");
    try {
        const items = await contract.bag(); // Single unnamed output, returns the array directly
        console.log("Items in your bag:", items);
        return items;
    } catch (error) {
        const reason = parseRevertReason(error, contract.interface);
        console.error("Error calling bag():", reason);
        return [];
    }
}

async function callGrab(item) {
    console.log(`\n--- Calling grab("${item}") ---`);
    try {
        const contractLogicSuccess = await contract.grab.staticCall(item);
        const tx = await contract.grab(item);
        console.log(`Grab transaction for "${item}" sent:`, tx.hash);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`grab("${item}") successful (contract logic returned ${contractLogicSuccess}, transaction confirmed).`);
            return contractLogicSuccess;
        } else {
            console.error(`Grab transaction for "${item}" failed (reverted on-chain).`);
            return false;
        }
    } catch (error) {
        const reason = parseRevertReason(error, contract.interface);
        console.error(`Error calling grab("${item}"): ${reason}`);
        return false;
    }
}

async function callDrop(item) {
    console.log(`\n--- Calling drop("${item}") ---`);
    try {
        const contractLogicSuccess = await contract.drop.staticCall(item);
        const tx = await contract.drop(item);
        console.log(`Drop transaction for "${item}" sent:`, tx.hash);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`drop("${item}") successful (contract logic returned ${contractLogicSuccess}, transaction confirmed).`);
            return contractLogicSuccess;
        } else {
            console.error(`Drop transaction for "${item}" failed (reverted on-chain).`);
            return false;
        }
    } catch (error) {
        const reason = parseRevertReason(error, contract.interface);
        console.error(`Error calling drop("${item}"): ${reason}`);
        return false;
    }
}

async function callGoString(directionString) {
    console.log(`\n--- Calling go("${directionString}") ---`);
    try {
        const staticCallResult = await contract.go.staticCall(directionString);
        const expectedMoved = staticCallResult.moved;
        const expectedReachedExit = staticCallResult.reachedExit;

        console.log("Simulated call result for go(...):");
        console.log("  Expected Moved:", expectedMoved);
        console.log("  Expected Reached Exit:", expectedReachedExit);

        const tx = await contract.go(directionString);
        console.log(`Go ("${directionString}") transaction sent:`, tx.hash);
        const receipt = await tx.wait();
        console.log(`go("${directionString}") transaction mined.`);

        if (receipt.status === 1) {
            console.log("Move successful (transaction confirmed).");
            if (expectedReachedExit) {
                console.log("Congratulations! You reached the exit!");
            }
            return { moved: expectedMoved, reachedExit: expectedReachedExit, success: true };
        } else {
            console.error("Move transaction failed (reverted on-chain).");
            return { moved: false, reachedExit: false, success: false };
        }
    } catch (error) {
        const reason = parseRevertReason(error, contract.interface);
        console.error(`Error calling go("${directionString}"): ${reason}`);
        return { moved: false, reachedExit: false, success: false };
    }
}

async function callGoEnum(directionEnum) {
    const directionName = DirectionNames[directionEnum];
    if (directionName === undefined) {
        console.error(`\nError: Invalid direction enum value: ${directionEnum}. Must be 0-3.`);
        return { moved: false, reachedExit: false, success: false };
    }
    console.log(`\n--- Calling go(Direction.${directionName}) which translates to go("${directionName}") ---`);
    return callGoString(directionName);
}

async function getBagSize() {
    console.log("\n--- Calling bagSize() public variable ---");
    try {
        const size = await contract.bagSize();
        console.log("Max bag size:", size.toString());
        return size;
    } catch (error) {
        const reason = parseRevertReason(error, contract.interface);
        console.error("Error getting bagSize:", reason);
        return null;
    }
}

// Entry Point
async function main() {
    console.log(`Interacting with RPGGame contract at ${contractAddress}`);
    console.log(`Using wallet: ${wallet.address}`);
    let balance;
    try {
        balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} tRBTC`);
        if (balance === 0n) {
            console.warn("Warning: Wallet has 0 tRBTC. Transactions will likely fail due to insufficient gas. Please fund your wallet.");
        }
    } catch (e) {
        console.error("Could not fetch wallet balance. Ensure RPC URL is correct and network is accessible.", e.message);
    }

    await getBagSize();
    await callNewGame();
    let roomInfo = await callLook();
    await callBag();

    if (roomInfo && roomInfo.items && roomInfo.items.includes("Key")) {
        console.log("Key found in the room. Attempting to grab...");
        const grabSuccess = await callGrab("Key");
        if(grabSuccess) {
            console.log("Successfully grabbed the Key.");
        } else {
            console.log("Failed to grab the Key (see previous errors for details).");
        }
    } else {
        console.log("Key not found in the room or room info not available.");
    }

    await callBag();

    console.log("\nAttempting to go East (string)...");
    let moveResult = await callGoString("East");

    if (moveResult.success) {
        if (moveResult.reachedExit) {
            console.log("Game Won after moving East! You can look around the exit room.");
            await callLook();
            console.log("\n--- End of script (Game Won) ---");
            return;
        } else if (moveResult.moved) {
            console.log("Moved East to a new room.");
            await callLook();
        } else {
            console.log("Tried to move East, but the move was not possible (e.g., a wall or requires key, check logs above).");
        }
    } else {
        console.log("Attempt to move East failed at the transaction level (check logs above for reason).");
    }

    console.log("\n--- End of script ---");
}

main().catch(error => {
    console.error("Unhandled error in main execution:", error);
    const reason = parseRevertReason(error, contract.interface); // Try to parse if it's a contract error
    console.error("Potentially decoded reason:", reason);
    process.exitCode = 1;
});
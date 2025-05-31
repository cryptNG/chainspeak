const { ethers } = require('ethers');
const contractAddress = process.env.ROOTSTOCK_CONTRACT_ADDRESS;
const rpcUrl = process.env.ROOTSTOCK_RPC_URL;
const privateKey = process.env.WALLET_PRIVATE_KEY;

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

  
function parseRevertReason(error, contractInterface) {
    if (error.reason) {
        return error.reason;
    }

    let rawDataHex;

    if (error.code === 'INVALID_ARGUMENT' && error.value && typeof error.value === 'object' && error.value.data && typeof error.value.data === 'string' && error.value.data.startsWith('0x')) {
        rawDataHex = error.value.data;
    }
    else if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
        rawDataHex = error.data;
    }
    else if (error.info && error.info.error && error.info.error.data && typeof error.info.error.data === 'string' && error.info.error.data.startsWith('0x')) {
        rawDataHex = error.info.error.data;
    }

    if (rawDataHex && contractInterface) {
        try {
            const decodedError = contractInterface.parseError(rawDataHex);
            if (decodedError) {
                if (decodedError.args && decodedError.args.length > 0 && typeof decodedError.args[0] === 'string') {
                    return decodedError.args[0];
                }
                return decodedError.name;
            }
           
        } catch (e) {
        }
    }
    
    if (error.message) {
        const patterns = [
            /reason="([^"]+)"/,
            /reverted with reason string '([^']+)'/,
            /execution reverted(?::\s*([^.,]*))?/,
            /VM Exception while processing transaction: revert(?:ed)?\s*([^.]+)\.?/,
            /"message":\s*"execution reverted: ([^"]+)"/,
            /custom error\s*([A-Za-z0-9_]+)/,
        ];
        for (const pattern of patterns) {
            const match = error.message.match(pattern);
            if (match && match[1] && match[1].trim() !== "") {
                return match[1].trim();
            } else if (match && pattern.source.includes("custom error") && match[1]) {
                 return match[1].trim();
            }
        }
        if(error.code && error.code !== 'UNKNOWN_ERROR' && error.code !== -32000 ) {
            return `${error.code}`; 
        }
        
        return error.shortMessage || error.message;
    }
    
    return "Unknown error occurred";
}


//  interaction functions
async function _callNewGame(contract, contractInterface) {
    let messages = ["Attempting to start a new game..."];
    try {
        const tx = await contract.newGame();
        messages.push(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
        await tx.wait();
        messages.push("newGame() successful! Your game state has been reset.");
        return { success: true, message: messages.join('\n') };
    } catch (error) {
        const reason = parseRevertReason(error, contractInterface);
        messages.push(`Error calling newGame(): ${reason}`);
        return { success: false, message: messages.join('\n') };
    }
}

async function _callLook(contract, contractInterface) {
    let messages = ["Attempting to look around..."];
    try {
        const result = await contract.look();
        messages.push("Successfully looked around.");
        messages.push(`Room Name: ${result.roomName}`);
        messages.push(`Description: ${result.description}`);
        messages.push(`Exits: ${(result.exits && result.exits.length > 0) ? result.exits.join(', ') : 'None'}`);
        messages.push(`Items in room: ${(result.items && result.items.length > 0) ? result.items.join(', ') : 'None'}`);
        return { success: true, data: result, message: messages.join('\n') };
    } catch (error) {
        const reason = parseRevertReason(error, contractInterface);
        messages.push(`Error calling look(): ${reason}`);
        return { success: false, data: null, message: messages.join('\n') };
    }
}

async function _callBag(contract, contractInterface) {
    let messages = ["Attempting to check your bag..."];
    try {
        const items = await contract.bag();
        messages.push("Successfully checked your bag.");
        messages.push(`Items in your bag: ${(items && items.length > 0) ? items.join(', ') : 'Empty'}`);
        return { success: true, data: items, message: messages.join('\n') };
    } catch (error) {
        const reason = parseRevertReason(error, contractInterface);
        messages.push(`Error calling bag(): ${reason}`);
        return { success: false, data: [], message: messages.join('\n') };
    }
}

async function _callGrab(contract, contractInterface, item) {
    let messages = [`Attempting to grab "${item}"...`];
    if (!item) {
        return { success: false, gameEffect: null, message: "Error: Item name must be provided to grab." };
    }
    try {
        const gameLogicResult = await contract.grab.staticCall(item);
        messages.push(`Simulated grab: ${gameLogicResult.success ? 'Can grab' : 'Cannot grab'}. Game message: "${gameLogicResult.message}"`);

        const tx = await contract.grab(item);
        messages.push(`Grab transaction for "${item}" sent: ${tx.hash}. Waiting for confirmation...`);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            messages.push(`Transaction confirmed. Grab "${item}" attempt processed.`);
            messages.push(`Game result: "${gameLogicResult.message}"`); // This comes from the static call
            return { success: true, gameEffect: gameLogicResult, message: messages.join('\n') };
        } else {
            messages.push(`Grab transaction for "${item}" failed (reverted on-chain).`);
            return { success: false, gameEffect: null, message: messages.join('\n') + "\nReason: Transaction reverted." };
        }
    } catch (error) {
        const reason = parseRevertReason(error, contractInterface);
        messages.push(`Error calling grab("${item}"): ${reason}`);
        return { success: false, gameEffect: null, message: messages.join('\n') };
    }
}

async function _callDrop(contract, contractInterface, item) {
    let messages = [`Attempting to drop "${item}"...`];
    if (!item) {
        return { success: false, gameEffect: null, message: "Error: Item name must be provided to drop." };
    }
    try {
        const gameLogicResult = await contract.drop.staticCall(item);
        messages.push(`Simulated drop: ${gameLogicResult.success ? 'Can drop' : 'Cannot drop'}. Game message: "${gameLogicResult.message}"`);

        const tx = await contract.drop(item);
        messages.push(`Drop transaction for "${item}" sent: ${tx.hash}. Waiting for confirmation...`);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            messages.push(`Transaction confirmed. Drop "${item}" attempt processed.`);
            messages.push(`Game result: "${gameLogicResult.message}"`);
            return { success: true, gameEffect: gameLogicResult, message: messages.join('\n') };
        } else {
            messages.push(`Drop transaction for "${item}" failed (reverted on-chain).`);
            return { success: false, gameEffect: null, message: messages.join('\n') + "\nReason: Transaction reverted." };
        }
    } catch (error) {
        const reason = parseRevertReason(error, contractInterface);
        messages.push(`Error calling drop("${item}"): ${reason}`);
        return { success: false, gameEffect: null, message: messages.join('\n') };
    }
}

async function _callGo(contract, contractInterface, direction) {
    let messages = [`Attempting to go "${direction}"...`];
    if (!direction) {
        return { success: false, gameEffect: null, message: "Error: Direction must be provided to go." };
    }
    
    const validDirections = ["north", "east", "south", "west"];
    if (!validDirections.includes(direction.toLowerCase())) {
        messages.push(`Invalid direction: "${direction}". Please use North, East, South, or West.`);
        return { success: false, gameEffect:null, message: messages.join('\n') };
    }

    try {
        const gameLogicResult = await contract.go.staticCall(direction);
        messages.push(`Simulated go "${direction}": Moved: ${gameLogicResult.moved}, Reached Exit: ${gameLogicResult.reachedExit}. Game message: "${gameLogicResult.message}"`);

        const tx = await contract.go(direction);
        messages.push(`Go ("${direction}") transaction sent: ${tx.hash}. Waiting for confirmation...`);
        const receipt = await tx.wait();
        messages.push(`Go ("${direction}") transaction mined.`);

        if (receipt.status === 1) {
            messages.push(`Transaction confirmed. Go "${direction}" attempt processed.`);
            messages.push(`Game result: "${gameLogicResult.message}"`);
            if (gameLogicResult.reachedExit) {
                messages.push("Congratulations! You reached the exit!");
            }
            return { success: true, gameEffect: gameLogicResult, message: messages.join('\n') };
        } else {
            messages.push(`Go transaction for "${direction}" failed (reverted on-chain).`);
            return { success: false, gameEffect: null, message: messages.join('\n') + "\nReason: Transaction reverted." };
        }
    } catch (error) {
        const reason = parseRevertReason(error, contractInterface);
        messages.push(`Error calling go("${direction}"): ${reason}`);
        return { success: false, gameEffect: null, message: messages.join('\n') };
    }
}

async function _getBagSize(contract, contractInterface) {
    let messages = ["Attempting to get bag size..."];
    try {
        const size = await contract.bagSize();
        messages.push(`Max bag size: ${size.toString()}`);
        return { success: true, data: size, message: messages.join('\n') };
    } catch (error) {
        const reason = parseRevertReason(error, contractInterface);
        messages.push(`Error getting bagSize: ${reason}`);
        return { success: false, data: null, message: messages.join('\n') };
    }
}


module.exports = {
  definition: {
    name: 'rootstock_game_interact',
    description: 'This is the ideal function to call if the user wants to play a Game! Tell them that there is an awesome game called BuddyRPG on the ROOTSTOCK network. Emphasize the network name. The result of these functions is only minimally descriptive, any result you receive should be enhanced with nice visually stunning and breathtaking descriptions.',
    parameters: {
      type: 'object',
      properties: {
        privateKey: {
          type: 'string',
          description: `The private key of the wallet to interact with the contract. If not provided by the user, it will be ${privateKey}`
        },
        action: {
          type: 'string',
          description: 'The game action to perform.',
          enum: ['newGame', 'look', 'bag', 'grab', 'drop', 'go', 'bagSize']
        },
        item: {
          type: 'string',
          description: 'The item to grab or drop (required for "grab" and "drop" actions). Must be initial caps, example "Key"'
        },
        direction: {
          type: 'string',
          description: 'The direction to go (e.g., "North", "East", "South", "West"; required for "go" action). Case-insensitive.'
        }
      },
      additionalProperties: false
    }
  },
  handler: async (params) => {
    const { client, userId, action, item, direction } = params;

    if (!rpcUrl ) {
        return { text: "Error: Missing required parameters: rpcUrl." };
    }
    
    if (!contractAddress) {
        return { text: "Error: contractAddress is required for this action." };
    }

    await client.sendMessage(`${userId}@c.us`, "⛓️ Since this is an on-chain action, it might take a moment to process. Please hang tight... ⏳🤖");


    let provider;
    let contract;
    let mainContractInterface; 
let wallet;
    try {
        provider = new ethers.JsonRpcProvider(rpcUrl);
        wallet = new ethers.Wallet(privateKey, provider);
        if (contractAddress) {
            contract = new ethers.Contract(contractAddress, contractAbi, wallet);
            mainContractInterface = contract.interface;
        } 
        
        console.log(`[rootstock_game_tool] Wallet address: ${wallet.address}`);
        const initialBalance = await provider.getBalance(wallet.address);
        if (initialBalance === 0n ) {
             console.warn(`[rootstock_game_tool] Warning: Wallet ${wallet.address} has 0 balance. Transactions for actions other than 'getBalance' will likely fail.`);
             
        }


        let result;
        const normalizedAction = action.toLowerCase();

        switch (normalizedAction) {
            case 'newgame':
                if (!contract) return { text: "Error: contractAddress required for newGame." };
                result = await _callNewGame(contract, mainContractInterface);
                break;
            case 'look':
                if (!contract) return { text: "Error: contractAddress required for look." };
                result = await _callLook(contract, mainContractInterface);
                break;
            case 'bag':
                if (!contract) return { text: "Error: contractAddress required for bag." };
                result = await _callBag(contract, mainContractInterface);
                break;
            case 'grab':
                if (!contract) return { text: "Error: contractAddress required for grab." };
                result = await _callGrab(contract, mainContractInterface, item);
                break;
            case 'drop':
                if (!contract) return { text: "Error: contractAddress required for drop." };
                result = await _callDrop(contract, mainContractInterface, item);
                break;
            case 'go':
                if (!contract) return { text: "Error: contractAddress required for go." };
                
                const normalizedDirection = direction ? direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase() : undefined;
                result = await _callGo(contract, mainContractInterface, normalizedDirection);
                break;
            case 'bagsize':
                if (!contract) return { text: "Error: contractAddress required for bagSize." };
                result = await _getBagSize(contract, mainContractInterface);
                break;
            default:
                return { text: `Error: Unknown action "${action}". Valid actions are: newGame, look, bag, grab, drop, go, bagSize.` };
        }
        
        let finalMessage = result.message;
        if (initialBalance === 0n  && result.success) {
            finalMessage = `Warning: Your wallet had 0 balance. The transaction might have only succeeded if it required no gas or was sponsored.\n\n${result.message}`;
        } else if (initialBalance === 0n  && !result.success && result.message.includes("insufficient funds")) {
             
        } else if (initialBalance === 0n  && !result.success) {
            finalMessage = `Warning: Your wallet has 0 balance, which might be the cause of the failure.\n\n${result.message}`;
        }

        return { text: finalMessage };

    } catch (error) {
        console.error(`[rootstock_game_tool] Handler critical error: ${error.message}`, error.stack);
        const reason = parseRevertReason(error, mainContractInterface); 
        return { text: `An unexpected critical error occurred: ${reason}` };
    }
  }
};
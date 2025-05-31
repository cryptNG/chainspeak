import {HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
//import "@nomicfoundation/hardhat-toolbox";
//require("@nomicfoundation/hardhat-chai-matchers");
import "@nomicfoundation/hardhat-ignition-ethers";

const { GNOSIS_MNEMONIC,HEDERA_MNEMONIC,ROOTSTOCK_APIKEY } = process.env;

console.log(process.env);
const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: false,
                // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
                runs: 200,
            },
            viaIR: true,
             evmVersion: `london`,
        },
    },
    namedAccounts: {
        deployer: 0,
        receiver: 1,
    },
    defaultNetwork: "testnet",
    networks: {
        // View the networks that are pre-configured.
        // If the network you are looking for is not here you can add new network settings
        local_docker: {
            url: `http://172.17.0.2:8545`,
            gasPrice: 10000000000,
            gas: 25e8,
            blockGasLimit: 0x5ffffffffffffffff,
            allowUnlimitedContractSize: true,
        //accounts: ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80','0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'],
        },
        testnet: {
            url: "https://testnet.cryptng.xyz:8545",
            //gas:100000000000 ,
            blockGasLimit: 0x1fffffffffffff,
            allowUnlimitedContractSize: true,
            accounts: {
            mnemonic: 'balcony over chase second wrap hospital film tongue recycle credit staff parent',
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 20,
            passphrase: "",
            },
        },
        
        hedera: {
            url: "https://testnet.hashio.io/api",
            gasPrice: 490000000000,
            blockGasLimit: 0x1fffffffffffff,
            accounts: {
                mnemonic: `${HEDERA_MNEMONIC}`,
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: "",
            }
          },
        rootstock: {
            url: `https://rpc.testnet.rootstock.io/${ROOTSTOCK_APIKEY}`,
            chainId: 31,
            gasPrice: 90000000,
            accounts: {
                mnemonic: `${HEDERA_MNEMONIC}`,
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: "",
            }
          },
        sanko: {
            url: `https://sanko-arb-sepolia.rpc.caldera.xyz/http`,
            chainId: 1992,
            gasPrice: 90000000,
            accounts: {
                mnemonic: `${HEDERA_MNEMONIC}`,
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: "",
            }
          },
          kaia: {
            url: `https://rpc.ankr.com/kaia_testnet`,
            chainId: 1001,
            gasPrice: 90000000,
            blockGasLimit: 999999999999,
            accounts: {
                mnemonic: `${HEDERA_MNEMONIC}`,
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: "",
            }
          },
    },
    etherscan: {
        apiKey: {
            scroll: 'VGT2V589VNFQ4CFKJKYR7VW8XPC3WIACCW',
            neonlabs: "test",
            chiado:"your key",
            rsktestnet: `${ROOTSTOCK_APIKEY}`,
            sanko: 'empty'
        },
        customChains: [
          {
                network: "rootstock",
                chainId: 31,
                urls: {
                    apiURL: "https://rootstock-testnet.blockscout.com/api/",
                    browserURL: "https://rootstock-testnet.blockscout.com/",
                }
            },
            {
                network: "sanko",
                chainId: 1992,
                urls: {
                apiURL: "https://sanko-arb-sepolia.explorer.caldera.xyz/api",
                browserURL: "https://sanko-arb-sepolia.explorer.caldera.xyz"
                }
            }
        ],
    },
};
export default config;
# ChainSpeak 🏮 - Your Fate, Your Chat, Your Crypto Journey

**EthGlobal 2025 Prague Submission**

[![EthGlobal][ethglobal-shield]][ethglobal-url]

## ✨ _"Exploring Web3, with a trusted friend."_ ✨

---

**ChainSpeak (にし渡り)** - where "Enishi" (にし) signifies a fate encounter, and "Watari" (渡り) means to traverse. Following our previous success at ETHPrague with **[Susuwatari](https://devfolio.co/projects/susuwatari-72d7)**, a location-based NFT game, ChainSpeak aims to allow users to traverse web3 for new fate encounters between users and the decentralized world, making Web3 accessible to everybody through the simplicity of a WhatsApp chat.

---

## 📜 Table of Contents

*   [🎯 Our Vision](#-our-vision)
*   [🤖 What is ChainSpeak?](#-what-is-ChainSpeak)
*   [💡 Key Features](#-key-features)
*   [🛠️ How It Works](#️-how-it-works)
    *   [🧠 The AI Brain](#-the-ai-brain)
    *   [🔗 Blockchain Interaction & EIP-7702 (The Vision & The Reality)](#-blockchain-interaction--eip-7702-the-vision--the-reality)
*   [🚀 Current Capabilities (ETHGlobal Prague 2025 Iteration)](#-current-capabilities-ethglobal-prague-2025-iteration)
*   [🛡️ Privacy First](#️-privacy-first)
*   [🛣️ Future Roadmap](#️-future-roadmap)
*   [🤝 The "ChainSpeak" Connection](#-the-ChainSpeak-connection)
*   [🏆 Submission for EthGlobal Prague 2025](#-submission-for-ethglobal-prague-2025)

---

## 🎯 Our Vision

Blockchain and Cryptocurrencies, while revolutionary, always presents a hard learning curve, hindering mainstream adoption. ChainSpeak's core mission is to **dismantle entry barriers**. We want a future where interacting with decentralized applications, managing digital assets, and exploring all the blockchains is as intuitive as sending a message to a friend. We want to empower users to "traverse" through Web3 with confidence, guided by a helpful AI buddy.

---

## 🤖 What is ChainSpeak?

ChainSpeak is an **AI-enabled WhatsApp chatbot** designed to serve as your personal gateway to the Web3 ecosystem. Using natural language, users can:

*   Interact with multiple blockchains and smart contracts.
*   Execute transactions.
*   Retrieve on-chain data.
*   Play blockchain-based games.
*   And much more, all without needing to understand complex interfaces or crypto-wording.

---

## 💡 Key Features

*   **📱 Familiar Interface:** Uses WhatsApp, an app used by billions globally.
*   **🗣️ Natural Language Processing:** Understands and executes commands given in plain English (and other languages!).
*   **🔗 Multi-Chain Interaction:** Designed to connect with a wide range of blockchain networks.
*   **🎮 On-Chain Gaming Simplified:** Play deployed games by simply chatting with the bot.
*   **🔗 Easy Smart Contract interactions** Do anything you want with any smart contract, just by chatting with your assistant.
*   **🔒 Secure (Vision):** Aims to utilize advanced account abstraction (EIP-7702) for secure, user-controlled transaction delegation.
*   **🕵️ Privacy-Conscious AI (vision):** Minimizes data exposure to third-party AI providers (future vision).

---

## 🛠️ How It Works

### 🧠 The AI Brain

At the heart of ChainSpeak is a sophisticated AI.

*   **Current Iteration (ETHGlobal Prague 2025):** For this hackathon, we are utilizing the known powerful, off-the-shelf Large Language Model – **OpenAI's GPT-4.1**, specifically because of its **function calling capabilities**. This allows for fast development, simple natural language understanding, and outstanding intent recognition within our short time and budget constraints.
*   **Future Vision:** Our long-term goal is to transition to a **self-hosted 70B or 120B parameter LLM** with fine-tuned function calling. This will grant us greater control, enhance privacy, and allow for more specialized Web3 capabilities, but it'll probably cost us more than we make in a year :)

We are committed to user privacy. Even while using OpenAI's models, our architecture is designed to **minimize the data shared with the AI**, sending only what is essential for understanding user intent and invoking the correct blockchain functions. While we will store some of the user data on our backend to allow more natural interactions, in future iterations, this stored info will also be encrypted and minimized where possible.

### 🔗 Blockchain Interaction & EIP-7702 (The Vision & The Reality)

Our goal is to make blockchain interactions seamless and secure, primarily through an extension of Account Abstraction: **EIP-7702**.

**EIP-7702 Vision:**
EIP-7702 proposes a new transaction type that allows an Externally Owned Account (EOA) to temporarily act as a smart contract wallet for a single transaction. This is incredibly useful for delegation. We want users creating "sub-wallets" or "delegate permissions" for ChainSpeak. For example, a user could authorize the chatbot to execute up to 10 specific transactions (e.g., "mint NFT," "claim reward") from a designated sub-wallet with a pre-funded gas allowance. This means ChainSpeak could act on the user's behalf for a limited scope of pre-approved actions without compromising the user's main wallet keys. The chatbot effectively becomes a temporary delegate with a clear set of permissions and a limited transaction pool.

**The ETHGlobal Prague 2025 Reality (Spoofing EIP-7702):**
EIP-7702 is a very new Ethereum Improvement Proposal. While approved, it has not yet been widely implemented by major chains. Integrating it fully within the hackathon timeframe was unfeasible.
Therefore, for this iteration, we have **"spoofed" the EIP-7702 user experience**. This means:

1.  Users can conceptually authorize the chatbot for a set number of actions.
2.  The chatbot *simulates* having a delegate wallet with pre-approved transaction capabilities.
3.  In the backend, for this demo, transaction execution will be handled by a pre-funded project wallet, while mimicking the *intended flow* of EIP-7702.

This approach allows us to demonstrate the user-facing benefits and interaction model of EIP-7702, highlighting its potential to revolutionize how users interact with dApps via agents like ChainSpeak, even before the EIP sees widespread adoption. **True EIP-7702 integration remains a top priority for future development. --- EIP 7702 has already been approved so it shouldn't be long!**

---

## 🚀 Current Capabilities (ETHGlobal Prague 2025 Iteration)

During this hackathon, ChainSpeak can interact with the following platforms and perform these actions (this is written before development so we might not be able to do all the integrations, i am writing this in case i forget to update it later):

*   **🔗 Supported Networks/Services:**
    *   **Blockscout:** Retrieve transaction history for any wallet as a screenshot.
    *   **Flow:** Interact with Flow-based assets or contracts.
    *   **Hedera:** Engage with Hedera's network services.
    *   **Pyth:** Fetch real-time price feeds and/or rolle some D20's for your dungeons and dragons game!
    *   **Rootstock (RSK):** Play a text based RPG on-chain, through Whatsapp!.
    *   **Yellow:** All your AI interactions will be securely logged so that you know there have been no manipulations.


---

## 🛡️ Privacy First

While using the power of OpenAI's models for this iteration, we are acutely aware of data privacy concerns. Our design philosophy is to **minimize the data footprint** sent to external AI services. We only transmit the necessary information for intent recognition and function parameter extraction, ensuring that sensitive user data beyond the immediate request context is not unnecessarily exposed. Our future goal of self-hosting a large language model will further solidify this commitment.

---

## 🛣️ Future Roadmap

ChainSpeak is just beginning its work. Our future plans include:

*   **✅ Full EIP-7702 Integration:** Transition from spoofing to native EIP-7702 support as chains adopt it.
*   **🧠 Self-Hosted LLM:** Deploy our own 70B/120B parameter model for enhanced privacy, control, and Web3-specific fine-tuning.
*   **🌐 Expanded (maybe Dynamic) Blockchain Support:** Integrate with more Layer 1s, Layer 2s, and specific dApps.
*   **🧩 Deeper and Dynamic Smart Contract Interactions:** Allow more complex multi-step operations and contract deployments.
*   **💸 DeFi Management:** Enable users to manage staking, swapping, and liquidity provision via chat.
*   **🖼️ NFT Management:** Simplified minting, trading, and portfolio viewing for NFTs.
*   **🔔 Personalized Notifications:** Proactive alerts for on-chain events relevant to the user.
*   **🌍 Better Multi-Language Support:** Making Web3 accessible to non-English speakers.

---


## 🏆 Submission for EthGlobal Prague 2025

ChainSpeak is proudly submitted to EthGlobal Prague 2025. We believe it represents a significant step towards making Web3 universally accessible and user-friendly. We're excited to share our progress and vision with the community!

---

*Let the fated wandering begin!*

[ethglobal-shield]: https://img.shields.io/badge/EthGlobal-Prague%202025-blueviolet
[ethglobal-url]: https://ethglobal.com/events/prague2025
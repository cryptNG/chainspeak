# DeepThought – Speak with Crypto ⸜(｡˃ ᵕ ˂ )⸝

**EthGlobal 2025 Prague Submission**

[![EthGlobal][ethglobal-shield]][ethglobal-url]

---

DeepThought is our next step toward making Web3 feel as familiar as sending a message. DeepThought brings decentralized networks to your fingertips through a simple WhatsApp chat—no jargon, no wallets to master, just easy conversation.
Inspired by The Hitchhiker's Guide to the Galaxy, we want to enable users to deploy and interact with smart contracts, access services, and use APIs—all directly through their most loved messaging platform.

---

## Table of Contents

- [Our Vision](#our-vision)  
- [What Is DeepThought?](#what-is-deepthought)  
- [Key Features](#key-features)  
- [How It Works](#how-it-works)  
  - [The AI Brain](#the-ai-brain)  
  - [Blockchain Interaction & EIP-7702](#blockchain-interaction--eip-7702)  
- [Current Capabilities (EthGlobal Prague 2025)](#current-capabilities-ethglobal-prague-2025)  
- [Privacy by Design](#privacy-by-design)  
- [Future Roadmap](#future-roadmap)  
- [The DeepThought Connection](#the-deepthought-connection)  
- [Submission for EthGlobal Prague 2025](#submission-for-ethglobal-prague-2025)  

---

## Our Vision 

Blockchain and cryptocurrencies promise a new era of transparency and ownership—but for most people, the learning curve is too steep. DeepThought’s goal is to bridge that gap. We want anyone, whether a novice or an experienced builder, to interact with decentralized networks as naturally as chatting with a friend ₍^. ̫.^₎. No complicated wallets. No command-line tools. Just type your request, and DeepThought handles the rest.

---

## What Is DeepThought? (•_- )

DeepThought is a WhatsApp chatbot powered by AI. Instead of switching between multiple apps or wrestling with tiny buttons, you simply open a chat and ask:

- “What’s my Ethereum balance?”  
- “Mint an NFT on Flow.”  
- “Swap 0.5 ETH for DAI.”  
- “Roll a d20 for my on-chain RPG quest.”
- "Let me play a game."

Behind the scenes, DeepThought manages your wallet interactions (through delegated “sub-wallets”), signs transactions, and calls smart contracts on your behalf. In other words: you talk, and we handle all the blockchain complexity.

---

## Key Features

1. **Chat-First Experience**  
   Interact with every supported blockchain using plain language—no wallet UIs, no confusing settings.  
2. **Multi-Chain Support**  
   Ethereum, Flow, Hedera, RSK, Pyth oracle feeds, and more. DeepThought connects to each network behind the scenes.  
3. **On-Chain Gaming**  
   Play simple text-based RPGs or mini-games on Rootstock and other chains without leaving your chat.  
4. **Secure Delegation (Vision)**  
   We’re building toward [EIP-7702](https://eip7702.io/), offering temporary “sub-wallets” so you can delegate limited permissions to the bot without exposing your main private key.  
5. **Privacy-First AI (Vision)**  
   We minimize the data shared with external AI services—future versions will store as little information as possible, with end-to-end encryption. Privacy first after all. ₍⸍⸌̣ʷ̣̫⸍̣⸌₎ﾉ♡
6. **Extensible & Modular**  
   New chains and dApps can be added quickly. We’ve architected DeepThought so additional integrations—DeFi swaps, NFT marketplaces, DAO voting—fall into place with minimal fuss.

---

## How It Works ≽^•⩊•^≼

### The AI Brain

- **Today’s Setup (EthGlobal Prague 2025):**  
  We use OpenAI’s GPT-4.1 with function-calling to interpret your messages. When you ask, “Send 0.3 ETH to 0x123…,” GPT-4.1 extracts the intent (send), amount (0.3 ETH), and recipient (0x123…). Our backend then constructs the transaction and alerts you to confirm.  
- **Tomorrow’s Vision:**  
  A self-hosted 70B+ parameter LLM, fine-tuned on Web3 protocols and EIP specifications. That shift will cut out third-party APIs, reduce latency, and give us full control over how user data is handled.

Even now, we only send the bare minimum to GPT-4.1—just enough context to understand your request. Your full wallet data never leaves our secure backend. Anything we store on-chain or off-chain is encrypted at rest, and we’ll layer in end-to-end encryption soon.

### Blockchain Interaction & [EIP-7702](https://eip7702.io/)

**[EIP-7702](https://eip7702.io/) Vision**  
Account Abstraction (AA) takes over the clunky parts of wallet management. [EIP-7702](https://eip7702.io/) specifically allows you to “lend” certain transaction powers to a smart contract wallet for a single operation. In DeepThought’s world:

1. You authorize a “sub-wallet” for a handful of actions—minting an NFT, claiming a reward, whatever you choose.  
2. You deposit a small gas allowance into that sub-wallet.  
3. DeepThought executes approved actions on your behalf, and you never share your main private key.

This model removes the need to manually confirm every single signature. You still control exactly what actions are allowed, and you can revoke the sub-wallet at any time.

**EthGlobal Prague 2025 Reality (Spoofed EIP-7702)**  
Unfortunately (¬`‸´¬), since most blockchains haven’t shipped native EIP-7702 yet, we simulate it:

- When you “authorize” DeepThought, our backend creates a temporary in-memory sub-wallet and tracks how many actions remain.  
- Each time you send a command, we decrement the counter. A pre-funded project wallet executes the transaction, but it appears to come from your delegated sub-wallet.  
- Once EIP-7702 support goes live on chains, we’ll drop the simulation and switch to real on-chain delegates ദ്ദി(ᵔᗜᵔ).

---

## Current Capabilities (EthGlobal Prague 2025)

During this hackathon, DeepThought can:

- **Blockscout History Screenshots**  
  Ask for any wallet’s recent transactions, and get a screenshot of the Blockscout page right in your chat.  
- **Flow Token & Contract Queries**  
  Check balances or call simple functions on Flow-based contracts.  
- **Hedera Account Management**  
  Query balances, send HBAR, or check transaction status on Hedera.  
- **Pyth Oracle Feeds & RNG**  
  Fetch up-to-the-second price data for tokens—or roll a “d20” for your text-based RPG.  
- **RSK Text-Based RPG**  
  Dive into a minimal on-chain adventure: pick actions, see outcomes, level up your character, all through WhatsApp.  
- **Yellow Protocol Logging**  
  Every AI ↔ user interaction is recorded on Yellow, so you can audit the conversation and verify nothing was tampered with.

> *Note: We set out to integrate more platforms, but actual availability depends on development progress. What’s listed above is what we’ve completed or are confidently demoing.*

---

## Privacy by Design

We built DeepThought around the principle of “share nothing you don’t have to.” Here’s what stays private:

- **Your Full Private Key**  
  Never shared with AI, never exposed in logs.  
- **Complete Transaction History**  
  We only send your immediate request (e.g., “send 1 ETH to X”) and the parameters needed to fulfill it.  
- **Personal Chat Logs**  
  Stored only to maintain context (so you can say “send the rest of my ETH to Y” without repeating yourself). These logs are encrypted at rest. Future updates will add client-side encryption so even we can’t see them.

Down the line, we plan to add zero-knowledge proofs to let you prove ownership of a wallet without revealing your private key, and roll out full end-to-end messaging encryption.

---

## Future Roadmap

DeepThought has a busy roadmap ahead. Highlights include:

- **Native EIP-7702 Integration**  
  Once major chains support it, we’ll enable real on-chain sub-wallets and drop the spoofed workflow.  
- **Self-Hosted LLM**  
  Migrate to our own 70B+ parameter model, eliminating third-party AI calls, cutting latency, and giving us full control over privacy.  
- **Expanded Chain & dApp Coverage**  
  Ethereum L2s, Solana, Avalanche—and popular DeFi protocols like Uniswap, Aave, and Curve.  
- **Advanced Multi-Step Workflows**  
  Instead of one-off commands, let users say “swap USDC for ETH, then stake in Lido,” and we’ll execute the entire sequence.  
- **DeFi Portfolio Dashboard (Chat-Style)**  
  “What’s my total TVL?” “Show my staking yields.” “Rebalance my holdings for a 60/40 split.”  
- **NFT Management**  
  Mint, list, bid, transfer, and track entire NFT collections—right in WhatsApp.  
- **Proactive Alerts & Notifications**  
  “Notify me when ETH price drops below $3,000” or “Alert me if someone places a bid on my NFT.”  
- **Global, Multilingual Support**  
  Expand beyond English—Spanish, Mandarin, Hindi, Portuguese, and more—so everyone can chat with DeepThought in their preferred language.

---

## The DeepThought Connection

DeepThought is more than a bot; it’s a bridge between you and decentralized networks. Whether you’re:

- A seasoned builder checking block confirmations,  
- A collector minting your first NFT,  
- A gamer rolling on-chain dice for your RPG adventure,  
- Or just someone curious about “what’s happening in crypto”—

DeepThought walks you through every step ⸜(｡˃ ᵕ ˂)⸝♡. No more hunting for the right dApp UI. No more “gas wars” or wallet imports. Just chat. That’s how Web3 should feel.

---

## Submission for EthGlobal Prague 2025

DeepThought is our entry to EthGlobal Prague 2025. We believe it demonstrates a clear path to making Web3 accessible and intuitive for everyone. We can’t wait to share our WhatsApp demo and show you how simple it is to “speak” with crypto. ദ്ദി( • ᴗ - ) ✧

[ethglobal-shield]: https://img.shields.io/badge/EthGlobal-Prague%202025-blueviolet  
[ethglobal-url]: https://ethglobal.com/events/prague2025  

#!/usr/bin/env node

const fs = require('fs');
const nodeHtmlToImage = require('node-html-to-image');

/**
 * Determines the appropriate Blockscout domain and API version for a given chain.
 * @param {string} chain - Simplified chain key (e.g., 'eth', 'gnosis', 'optimism', 'eth/sepolia')
 * @returns {{blockscoutDomain: string, apiBasePath: string, chainName: string}}
 */
function getBlockscoutHostAndApi(chain) {
  let blockscoutDomain;
  let apiBasePath = '/api/v2'; // Default to v2 API
  let chainName = chain;

  // Normalize chain input (e.g., 'ETH' -> 'eth')
  const normalizedChain = chain.toLowerCase();

  switch (normalizedChain) {
    case 'eth':
    case 'mainnet':
    case 'ethereum':
      blockscoutDomain = 'eth.blockscout.com';
      chainName = 'Ethereum Mainnet';
      break;
    case 'xdai':
    case 'gnosis':
      blockscoutDomain = 'gnosis.blockscout.com';
      chainName = 'Gnosis Chain';
      break;
    case 'optimism':
    case 'op':
      blockscoutDomain = 'optimism.blockscout.com';
      chainName = 'Optimism';
      break;
    case 'eth/sepolia':
    case 'sepolia':
      blockscoutDomain = 'eth-sepolia.blockscout.com';
      chainName = 'Sepolia Testnet';
      apiBasePath = '/api'; // Sepolia instance on blockscout.com seems to use legacy API path more reliably for txlist
                            // or has specific v2 paths that might differ.
                            // Let's try to stick to v2 if possible and adjust if needed by specific instances.
                            // For now, keeping v2 for consistency of response structure target.
                            // If this fails, it might indicate this specific instance uses legacy or different v2 path.
                            // UPDATE: Given the user provided a v2 structure, we must assume v2 is desired.
                            // If eth-sepolia.blockscout.com's v2 /transactions endpoint is different, this will fail.
      break;
    case 'polygon':
    case 'matic':
      blockscoutDomain = 'polygon.blockscout.com';
      chainName = 'Polygon PoS';
      break;
    // Add other chains here
    default:
      // Attempt to construct domain for chains like 'base', 'arbitrum', etc.
      // This is a guess and might need specific entries if the subdomain pattern differs.
      if (normalizedChain.includes('/')) {
        const parts = normalizedChain.split('/');
        blockscoutDomain = `${parts[0]}-${parts[1]}.blockscout.com`; // e.g., eth-holesky.blockscout.com
        chainName = normalizedChain.replace('/', ' ');
        chainName = chainName.charAt(0).toUpperCase() + chainName.slice(1); // Capitalize
      } else {
        blockscoutDomain = `${normalizedChain}.blockscout.com`;
        chainName = normalizedChain.charAt(0).toUpperCase() + normalizedChain.slice(1);
      }
      console.warn(`[blockscout] Unmapped chain key '${chain}'. Using constructed domain: '${blockscoutDomain}'. This may require adjustment.`);
  }
  return { blockscoutDomain, apiBasePath, chainName };
}


/**
 * Generates a base64 PNG of the last N transactions from Blockscout using API v2.
 * @param {Object} options
 * @param {string} options.wallet - Wallet address
 * @param {number} options.amount - Number of transactions to fetch
 * @param {string} [options.chain='eth'] - Blockscout chain identifier (e.g., 'eth', 'gnosis', 'optimism', 'eth/sepolia')
 * @returns {Promise<string>} - Base64-encoded PNG image
 */
async function generateTxImageBase64({
  wallet,
  amount = 5,
  chain = 'eth',
}) {
  const { blockscoutDomain, apiBasePath, chainName } = getBlockscoutHostAndApi(chain);

  if (!blockscoutDomain) {
    throw new Error(`Unsupported chain: ${chain}. Please add its configuration.`);
  }

  const baseUrl = `https://${blockscoutDomain}`;
  
  const apiUrl = `${baseUrl}${apiBasePath}/addresses/${wallet}/transactions`; //latest 50 entries of latest page and latest block by default


  console.log(`[blockscout] Fetching URL: ${apiUrl}`);
  let res;
  try {
    res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Blockscout-Tx-Image-Generator/1.1', 
        'Accept': 'application/json'
      }
    });
  } catch (networkErr) {
    console.error('[blockscout] Network error during fetch:', networkErr);
    throw new Error(`Network error: ${networkErr.message}`);
  }

  console.log(`[blockscout] HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) {
    let errBody = '';
    try {
      errBody = await res.text();
    } catch (e) {
      console.error('[blockscout] Failed to read error body:', e);
    }
    console.error(`[blockscout] Error body:\n${errBody}`);
    throw new Error(`Blockscout API error: ${res.status} ${res.statusText}. Body: ${errBody}`);
  }

  let data;
  try {
    data = await res.json();
    console.log("res.json(): " + JSON.stringify(data));
  } catch (parseErr) {
    console.error('[blockscout] Failed to parse JSON:', parseErr);
    let rawText = '';
    try {
    } catch(e) { /* ignore */ }
    console.error('[blockscout] Raw response text (if available):', rawText);
    throw new Error(`Invalid JSON response: ${parseErr.message}`);
  }

  if (!data || !Array.isArray(data.items)) {
    console.error('[blockscout] Unexpected API response structure. "items" array not found.');
    console.error('[blockscout] Full API response for debugging:', JSON.stringify(data, null, 2));
    throw new Error('Blockscout API error: "items" array not found in response.');
  }

  const rawTxs = data.items;
  const txs = rawTxs.slice(0, amount); 

  if (txs.length === 0) {
    console.log(`[blockscout] No transactions found for this address on ${chainName} or API returned empty items.`);
  }
  console.log(`[blockscout] Using ${txs.length} of ${rawTxs.length} fetched transactions for ${wallet} on ${chainName}`);

 const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Last ${txs.length > 0 ? txs.length : amount} transactions – ${wallet}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #1a1a1a;
        color: #e0e0e0;
        padding: 20px;
        line-height: 1.4;
      }
      .header {
        margin-bottom: 30px;
      }
      .header h1 {
        font-size: 28px;
        font-weight: 400;
        color: #ffffff;
        margin-bottom: 20px;
      }
      .header h1 .eoa-badge {
        background-color: #333;
        color: #ccc;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        margin-left: 10px;
        font-weight: 500;
      }
      .address-section {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      .address-icon {
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, #ff6b35, #f7931e);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      }
      .address-text {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        font-size: 16px;
        color: #ffffff;
      }
      .table-container {
        background-color: #1e1e1e;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #333;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 13px;
      }
      th, td { 
        padding: 16px 12px;
        text-align: left;
        border-bottom: 1px solid #333;
      }
      th { 
        background-color: #2a2a2a;
        font-weight: 600;
        color: #b0b0b0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      tr:hover {
        background-color: #252525;
      }
      .txn-hash {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      }
      .txn-hash a {
        color: #4a9eff;
        text-decoration: none;
      }
      .txn-hash a:hover {
        text-decoration: underline;
      }
      .timestamp {
        color: #888;
        font-size: 11px;
        margin-top: 4px;
      }
      .type-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        margin-bottom: 4px;
        display: inline-block;
      }
      .contract-call {
        background-color: rgba(74, 158, 255, 0.2);
        color: #4a9eff;
      }
      .coin-transfer {
        background-color: rgba(255, 107, 53, 0.2);
        color: #ff6b35;
      }
      .status-badge {
        background-color: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 500;
        width: fit-content;
      }
      .method-label {
        background-color: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        margin-top: 4px;
        display: inline-block;
      }
      .block-link {
        color: #4a9eff;
        text-decoration: none;
        font-weight: 500;
      }
      .block-link:hover {
        text-decoration: underline;
      }
      .from-to-section {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .direction-icon {
        color: #ff6b35;
        font-size: 16px;
      }
      .chain-icon {
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #ff6b35, #f7931e);
        border-radius: 50%;
        display: inline-block;
        margin-right: 4px;
      }
      .address-link {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        color: #4a9eff;
        text-decoration: none;
      }
      .address-link:hover {
        text-decoration: underline;
      }
      .address-label {
        color: #888;
        font-size: 11px;
        margin-top: 2px;
      }
      .value-eth {
        text-align: right;
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        font-weight: 500;
      }
      .fee-eth {
        text-align: right;
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>
        Last ${txs.length > 0 ? txs.length : amount} transactions
      </h1>
      <div class="address-section">
        <div class="address-icon">⬢</div>
        <span class="address-text">${wallet}</span>
      </div>
    </div>

    <div class="table-container">
      ${txs.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Txn hash</th>
            <th>Type</th>
            <th>Method</th>
            <th>Block</th>
            <th>From/To</th>
            <th>Value</th>
            <th>Fee</th>
          </tr>
        </thead>
        <tbody>
          ${txs.map(tx => {
            const fromAddress = tx.from ? tx.from.hash : 'N/A';
            const nativeValue = tx.value ? (Number(tx.value) / 1e18).toFixed(6) : '0.000000';
            const feeValue = tx.fee ? (Number(tx.fee) / 1e18).toFixed(6) : '0.000000';
            const methodLabel = tx.method || '';
            const isContract = tx.type === 'contract_call';
            return `
            <tr>
              <td>
                <div class="txn-hash">
                  <a href="${baseUrl}/tx/${tx.hash}" target="_blank">${tx.hash.slice(0, 10)}…</a>
                </div>
                <div class="timestamp">${new Date(tx.timestamp).toISOString().replace('T', ' ').slice(0, -5)}</div>
              </td>
              <td>
                <div class="type-badge ${isContract ? 'contract-call' : 'coin-transfer'}">
                  ${isContract ? 'Contract call' : 'Coin transfer'}
                </div>
                <div class="status-badge">✓ ${tx.status || 'Success'}</div>
              </td>
              <td>
                ${methodLabel ? `<div class="method-label">${methodLabel}</div>` : ''}
              </td>
              <td>
                <a href="${baseUrl}/block/${tx.block_number}" class="block-link" target="_blank">
                  ${tx.block_number}
                </a>
              </td>
              <td>
                <div class="from-to-section">
                  <span class="direction-icon">↓</span>
                  <span class="chain-icon"></span>
                  <a href="${baseUrl}/address/${fromAddress}" class="address-link" target="_blank">
                    ${fromAddress.slice(0, 6)}…${fromAddress.slice(-4)}
                  </a>
                </div>
                ${tx.fee_recipient ? `<div class="address-label">🔵 Fee Recipient: ${tx.fee_recipient}</div>` : ''}
              </td>
              <td class="value-eth">${nativeValue}</td>
              <td class="fee-eth">${feeValue}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
      ` : `<p class="no-txs">No transactions found for this address on ${chainName}.</p>`}
    </div>
  </body>
</html>
`;


  console.log('[blockscout] Rendering image HTML…');
  const imageBuffer = await nodeHtmlToImage({
    html,
    type: 'png',
    encoding: 'buffer',
    quality: 100,
    transparent: false,
    puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });
  console.log('[blockscout] Image rendered successfully');

  return imageBuffer.toString('base64');
}

// Example usage
(async () => {
  const wallet = '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97';
  const amount = 7;
  // Chains to test:
  // 'eth', 'gnosis', 'optimism', 'polygon', 'eth/sepolia'
  // Note: eth/sepolia might use a different domain like 'eth-sepolia.blockscout.com'
  const chain = 'eth'; // Or 'gnosis', 'optimism', 'polygon', 'sepolia'

  try {
    console.log(`[main] Generating image for ${wallet} on chain '${chain}', ${amount} transactions...`);
    const base64 = await generateTxImageBase64({ wallet, amount, chain });
    fs.writeFileSync('output.png', Buffer.from(base64, 'base64'));
    console.log('✅ Image written to output.png');
  } catch (err) {
    console.error('❌ Failed to generate transaction image:', err.message);
    if (err.stack) {
        console.error(err.stack);
    }
    process.exit(1);
  }
})();
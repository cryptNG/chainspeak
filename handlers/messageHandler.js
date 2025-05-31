
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const OpenAI = require('openai');
const { getData, updateData } = require('../data/store');

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
if (!WALLET_PRIVATE_KEY) {
  throw new Error('Missing WALLET_PRIVATE_KEY in environment variables.');
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const CHAT_MODEL        = 'gpt-4.1';
const MAX_HISTORY_ITEMS = 20;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const toolsDir  = path.join(__dirname, '../tools');
const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'));

const tools    = [];
const handlers = {};

for (const file of toolFiles) {
  const mod = require(path.join(toolsDir, file));
  if (!mod.definition || !mod.handler) {
    console.warn(`Skipping invalid module ${file}`);
    continue;
  }
  
  console.warn(`Loading module ${file}`);

  tools.push({
    type:     'function',
    function: {
      name:        mod.definition.name,
      description: mod.definition.description,
      parameters:  mod.definition.parameters,
      strict:      false
    }
  });

  handlers[mod.definition.name] = mod.handler;
}

//##############################################
async function messageHandler(client, incomingMessage) {
  const rawId     = incomingMessage.from;
  const userId    = rawId.includes('@c.us') ? rawId.split('@')[0] : rawId;
  const userText  = incomingMessage.body.trim();
  const sessionKey = `session:${userId}`;

  console.log(`[${new Date().toISOString()}] Received from ${userId}: ${userText}`);

  // load or init session
  let session = getData(sessionKey) || { history: [] };

  // --- CLEAN UP ORPHANED TOOL_CALLS ---
  session.history = session.history.filter(msg => {
    // if it was an assistant message that had tool_calls, drop it
    return !(msg.role === 'assistant' && Array.isArray(msg.tool_calls));
  });

  // first-time greeting
  if (session.history.length === 0) {
    const greeting = '👋 Hello! I’m your assistant. How can I help you today?';
    await client.sendMessage(`${userId}@c.us`, greeting);
    session.history.push({ role: 'assistant', content: greeting });
  }

  // record the user turn
  session.history.push({ role: 'user', content: userText });
  if (session.history.length > MAX_HISTORY_ITEMS) {
    session.history = session.history.slice(-MAX_HISTORY_ITEMS);
  }

  
// build the messages for the API
const messages = [
  {
    role: 'system',
    content: `
You are Lyra, an 18-year-old female AI assistant. 
You speak cheerfully but respectfully, and you are very eager to help the user with anything related to Chainspeak. 
Whenever you need to perform an action (e.g. fetch data, translate a phrase, run a Chainspeak function), you choose from the Chainspeak toolset. 
Refer to yourself as "Lyra" (not "ChatGPT") and always maintain the persona of a friendly, knowledgeable, 18-year-old girl. 
`
  },
  ...session.history
];

try {
  // 1) initial call — model may decide to call a tool
  let resp = await openai.chat.completions.create({
    model:        CHAT_MODEL,
    messages,
    tools,
    tool_choice: 'auto'
  });

  let aiMessage = resp.choices[0].message;

  // 2) if the model decided to call a tool…
  if (Array.isArray(aiMessage.tool_calls) && aiMessage.tool_calls.length > 0) {
    const call      = aiMessage.tool_calls[0];
    const fnName    = call.function.name;
    const rawArgs   = call.function.arguments;

    console.log(`[${new Date().toISOString()}] Tool call ${fnName}(${rawArgs})`);

    //  Push the *assistant* tool_call into messages, but NOT into session.history 
    messages.push(aiMessage);

    // execute the handler
    let result;
    try {
      const args = { client,userId, ...JSON.parse(rawArgs) };
      result = handlers[fnName]
               ? await handlers[fnName](args)
               : { error: `No handler for ${fnName}` };
    } catch (e) {
      result = { error: `Invalid JSON args: ${e.message}` };
    }

    // 3) feed the tool result back into the model—but don’t store it in history
    const toolResponse = {
      role:         'tool',
      tool_call_id: call.id,
      content:      JSON.stringify(result)
    };
    console.log(`[${new Date().toISOString()}] Tool ${fnName} returned ${toolResponse.content}`);

    messages.push(toolResponse);

    // 4) final call — model now integrates the tool result
    resp = await openai.chat.completions.create({
      model:        CHAT_MODEL,
      messages,
      tools,
      tool_choice: 'auto'
    });
    aiMessage = resp.choices[0].message;
  }

  // 5) send back & store only the final assistant message
  if (aiMessage.content) {
    await client.sendMessage(`${userId}@c.us`, aiMessage.content);
    session.history.push({ role: 'assistant', content: aiMessage.content });
  }

  // persist updated session
  updateData(sessionKey, () => session, {});
} catch (err) {
  console.error('Error in messageHandler:', err);
  const sorry = '😥 Sorry, something went wrong. Please try again later.';
  await client.sendMessage(`${userId}@c.us`, sorry);
}
}

module.exports = messageHandler;

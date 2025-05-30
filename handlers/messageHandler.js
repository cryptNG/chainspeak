const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY');
}

const CHAT_MODEL = 'gpt-4.1';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const toolsDir = path.join(__dirname, '../tools');
const tools = [];
const handlers = {};

fs.readdirSync(toolsDir)
  .filter(f => f.endsWith('.js'))
  .forEach(file => {
    const mod = require(path.join(toolsDir, file));
    if (mod.definition && mod.handler) {
      tools.push({ type: 'function', function: mod.definition });
      handlers[mod.definition.name] = mod.handler;
    }
  });

async function messageHandler(client, incomingMessage) {
  const userId = incomingMessage.from.split('@')[0];
  const userText = incomingMessage.body.trim();
  const sessionKey = `session:${userId}`;

  let session = [];

  session.history.push({ role: 'user', content: userText });

  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    ...session.history
  ];

  try {
    let response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
    });
    let assistantMessage = response.choices[0].message;

    if (assistantMessage.tool_calls?.length) {
      messages.push(assistantMessage);
      const toolCall = assistantMessage.tool_calls[0];
      let toolOutputContent = { error: `Tool ${toolCall.function.name} not implemented yet or failed.` };

      if (handlers[toolCall.function.name]) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          toolOutputContent = await handlers[toolCall.function.name]({ client, userId, ...args });
        } catch (e) {
          toolOutputContent = { error: `Error executing tool ${toolCall.function.name}: ${e.message}` };
        }
      }
      
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolOutputContent) });

      response = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
      });
      assistantMessage = response.choices[0].message;
    }

    if (assistantMessage.content) {
      await client.sendMessage(`${userId}@c.us`, assistantMessage.content);
      session.history.push({ role: 'assistant', content: assistantMessage.content });
    }

    updateData(sessionKey, () => session, {});
  } catch (err) {
    console.error(`Error for ${userId}:`, err.message);
    await client.sendMessage(`${userId}@c.us`, 'Sorry, something went wrong.');
  }
}

module.exports = messageHandler;
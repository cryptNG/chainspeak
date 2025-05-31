const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const messageHandler = require('./handlers/messageHandler');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-bot',
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let qrDisplayed = false;

client.on('qr', (qr) => {
    if (!qrDisplayed) {
        console.log('QR CODE:');
        qrcode.generate(qr, { small: true });
        qrDisplayed = true;
        console.log('Scan the QR code above to log in, for that, use whatsapp on the phone you want to host the bot with, and select -link device-');
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
    qrDisplayed = false;
});

client.on('authenticated', (session) => {
    console.log('Client is authenticated!');
    qrDisplayed = false;
});

client.on('auth_failure', () => {
    console.log('Authentication failed! Please scan the QR code again.');
    qrDisplayed = false;
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    qrDisplayed = false;
    
    setTimeout(() => {
        console.log('Attempting to reconnect...');
        client.initialize().catch(error => {
            console.error('Failed to reconnect:', error);
        });
    }, 5000);
});

client.on('message', async msg => {
    try {
        await messageHandler(client, msg);
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

client.initialize().catch(error => {
    console.error('Failed to initialize client:', error);
});

process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    try {
        await client.destroy();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    try {
        await client.destroy();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});
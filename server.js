const { Kafka } = require('kafkajs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Frontend files පෙන්වන්න
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Kafka Setup
const sslCert = fs.readFileSync(path.join(__dirname, 'ca.pem'), 'utf-8');
const kafka = new Kafka({
    clientId: 'crypto-dashboard',
    brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
    ssl: { rejectUnauthorized: true, ca: [sslCert] },
    sasl: {
        mechanism: 'scram-sha-256',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
    },
});

const consumer = kafka.consumer({ groupId: 'dashboard-group' });

const startDashboard = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'hii', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            const data = JSON.parse(message.value.toString());
            // ලැබෙන data එක WebSocket හරහා Frontend එකට යවනවා
            io.emit('crypto-update', data); 
        },
    });
};

server.listen(3000, () => {
    console.log('🚀 Dashboard server running on http://localhost:3000');
    startDashboard().catch(console.error);
});
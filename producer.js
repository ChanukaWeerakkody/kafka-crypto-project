const { Kafka, Partitioners } = require('kafkajs');
const fs = require('fs'); // File system module eka add kala
const path = require('path');
require('dotenv').config();

// ca.pem file eka kiyawagamu
const sslCert = fs.readFileSync(path.join(__dirname, 'ca.pem'), 'utf-8');

const kafka = new Kafka({
  clientId: 'crypto-producer',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
  ssl: {
    rejectUnauthorized: true, // Dan certificate eka thiyena nisa meka true karanna puluwan
    ca: [sslCert] // Ara kiyawagaththa certificate eka methanata damma
  },
  sasl: {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

const run = async () => {
  try {
    await producer.connect();
    console.log("🚀 Producer Connected Successfully with SSL Cert!");

    setInterval(async () => {
      try {
        const payload = { 
          symbol: 'BTC', 
          price: (Math.random() * 1000 + 60000).toFixed(2), 
          time: new Date().toISOString() 
        };

        await producer.send({
          topic: 'hii',
          messages: [
            { value: JSON.stringify(payload) },
          ],
        });

        console.log(`✅ Message sent: ${payload.symbol} - $${payload.price}`);
      } catch (err) {
        console.error("❌ Error sending message:", err.message);
      }
    }, 5000);

  } catch (error) {
    console.error("❌ Connection Error:", error.message);
  }
};

run();
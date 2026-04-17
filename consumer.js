const { Kafka } = require('kafkajs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sslCert = fs.readFileSync(path.join(__dirname, 'ca.pem'), 'utf-8');

const kafka = new Kafka({
  clientId: 'crypto-consumer',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
  ssl: {
    rejectUnauthorized: true, 
    ca: [sslCert] 
  },
  sasl: {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

const consumer = kafka.consumer({ groupId: 'crypto-group' });

const run = async () => {
  try {
    await consumer.connect();
    console.log("🚀 Consumer Connected Successfully!");

    // Subscribe to the 'hi' topic
    await consumer.subscribe({ topic: 'hii', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`📩 Received from Aiven: ${data.symbol} - $${data.price} | Time: ${data.time}`);
        } catch (err) {
          console.log("📩 Received (String):", message.value.toString());
        }
      },
    });

  } catch (error) {
    console.error("❌ Consumer Error:", error.message);
  }
};

run();
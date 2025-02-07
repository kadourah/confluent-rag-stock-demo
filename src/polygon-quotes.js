import { websocketClient } from "@polygon.io/client-js";
import { KafkaJS } from '@confluentinc/kafka-javascript';
import axios from 'axios';


import {
    AvroSerializer, SerdeType,
    SchemaRegistryClient, 
  } from "@confluentinc/schemaregistry";

  import dotenv from 'dotenv';

  dotenv.config();

  const polygonAPIKey = process.env.POLYGON_API_KEY;  
  

  const confluentRegistryUserName = process.env.CONFLUENT_REGISTRY_USERNAME;  
  const confluentRegistryPassword = process.env.CONFLUENT_REGISTRY_PASSWORD;
  const confluentKafkaUsername = process.env.CONFLUENT_KAFKA_USERNAME;
  const confluentKafkaPassword = process.env.CONFLUENT_KAFKA_PASSWORD;
 const confluentRegistryUrl = process.env.CONFLUENT_REGISTRY_URL
 const confluentkAKFkABroker= process.env.CONFLUENT_KAFKA_BROKER

 
  const topic = "stock_quotes";

 
  const basicAuthCredentials  = {
    credentialsSource: 'USER_INFO',
    userInfo: confluentRegistryUserName+ ':'+confluentRegistryPassword,
  };
  const createAxiosDefaults = {
    timeout: 10000
  };
  const clientConfig = {
    baseURLs: [confluentRegistryUrl],
    
    cacheCapacity: 512,
    cacheLatestTtlSecs: 60,
    basicAuthCredentials: basicAuthCredentials
  };


  

  const schemaString = JSON.stringify({
    "fields": [
      {"name": "ev", "type": "string"},
      {"name": "sym", "type": "string"},
      {"name": "bx", "type": "int"},
      {"name": "bp", "type": "float"},
      {"name": "bs", "type": "int"},
      {"name": "ax", "type": "int"},
      {"name": "ap", "type": "float"},
      {"name": "as", "type": "int"},
      {"name": "c", "type": "int"},
      {"name": "t", "type": "long"},
      {"name": "q", "type": "int"},
      {"name": "z", "type": "int"}
    ],
    "name": "StockQuotes",
    "namespace": "StockQuotesNS",
    "type": "record"
  });

  const schemaInfo = {
    schemaType: 'AVRO',
    schema: schemaString,
  };


const kafka = new KafkaJS.Kafka({
    kafkaJS: {
        brokers: [confluentkAKFkABroker],
        ssl: true,
        sasl: {
            mechanism: 'plain',
            username: confluentKafkaUsername,
            password: confluentKafkaPassword,
        },
    },
});

const producer = kafka.producer({
    kafkaJS: {
        allowAutoTopicCreation: true,
        acks: 1,
        compression: KafkaJS.CompressionTypes.GZIP,
    }
});


async function producerStart() {
    try {
        
  const schemaRegistryClient = new SchemaRegistryClient(clientConfig);
  await schemaRegistryClient.register(topic+ '-value'  , schemaInfo);
            
  const avroSerializerConfig = { useLatestVersion: true };
  
  const serializer = new AvroSerializer(schemaRegistryClient, SerdeType.VALUE, avroSerializerConfig);

        await producer.connect();
        const ws = websocketClient(polygonAPIKey, 'wss://delayed.polygon.io').stocks();

        ws.onerror = (err) => console.log('Failed to connect', err);
        ws.onclose = (code, reason) => console.log('Connection closed', code, reason);

        // Use a Promise to ensure the WebSocket lifecycle is properly handled
        await new Promise((resolve, reject) => {
            ws.onmessage = async (msg) => {
                try {
                    const parsedMessage = JSON.parse(msg.data);
                    console.log('Received message:', parsedMessage);

                    if (parsedMessage[0].ev === 'status' && parsedMessage[0].status === 'auth_success') {
                        console.log('Subscribing to the quootes channel');
                        ws.send(JSON.stringify({ "action": "subscribe", "params": "Q.NVDA" }));
                    }

                    if (parsedMessage[0].ev !== 'status') {
                        await Promise.all(parsedMessage.map(async (message) => {

                            if (message !== undefined) {

                              // Add default value to "op" if it's null
                              if (message.c === null || message.c === undefined) {
                                message.c = 0;
                              }

                            var msg = await serializer.serialize(topic, message);
                            console.log('Sending message:', msg);
                            await producer.send({
                                topic: topic,
                                messages: [
                                    {
                                        value: msg,
                                        key: message.sym,
                                    }
                                ],
                            });
                        }
                        }));
                    }
                } catch (err) {
                    console.error('Error processing message:', err);
                    reject(err); // Reject the promise if an error occurs
                }
            };
            ws.onclose = (code, reason) => {
                console.log('WebSocket closed:', code, reason);
                resolve(); // Resolve the promise when the WebSocket closes
            };

            ws.onerror = (err) => {
                console.error('WebSocket error:', err);
                reject(err); // Reject the promise on WebSocket error
            };
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await producer.disconnect();
    }
}

producerStart();
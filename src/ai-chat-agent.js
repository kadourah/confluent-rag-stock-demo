import axios from 'axios';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import readline from 'readline';
dotenv.config();

const openai_key= process.env.OPENAI_API_KEY

const mongodb_URL= process.env.MONGO_DB_URL

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

async function getEmbedding(query) {
    // Define the OpenAI API url and key.
    const url = 'https://api.openai.com/v1/embeddings';
    
    // Call OpenAI API to get the embeddings.
    let response = await axios.post(url, {
        input: query,
        model: "text-embedding-3-small"
    }, {
        headers: {
            'Authorization': `Bearer ${openai_key}`,
            'Content-Type': 'application/json'
        }
    });
    
    if(response.status === 200) {
        return response.data.data[0].embedding;
    } else {
        throw new Error(`Failed to get embedding. Status code: ${response.status}`);
    }
}

async function findSimilarDocuments(embedding) {
    const url = mongodb_URL; // Replace with your MongoDB url.
    const client = new MongoClient(url);
    
    try {
        await client.connect();
        
        const db = client.db('stock'); // Replace with your database name.
        const collection = db.collection('stock-quotes-data'); // Replace with your collection name.
        
       // const sample = await collection.findOne({}, { projection: { vector: 1 } });
            

        // Query for similar documents.
        const documents = await collection.aggregate([
  {"$vectorSearch": {
    "queryVector": embedding,
    "path": "vector",
    "numCandidates": 50,
    "limit": 10,
    "index": "vector_index"
      }}
]).toArray();
        
        return documents;
    } finally {
        await client.close();
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    
        rl.question('Please enter your query: ', async (query) => {
            try {
                const embedding = await getEmbedding(query);
                const documents = await findSimilarDocuments(embedding);
                const response = await getChatGPTResponse(query, documents);

                console.log(response);
            } catch(err) {
                console.error(err);
            } finally {
                rl.close();
            }
        });
    
}


// Function to get ChatGPT response
async function getChatGPTResponse(userPrompt, stockData) {
    //console.log('stockData', stockData);
   // console.log('userPrompt', userPrompt);
    try {
// Build a structured prompt with relevant stock information
const stockDetails = stockData.map(stock => `
    - **Stock Symbol:** ${stock.stock_symbol}
    - **Bid Price :** ${stock.bid_price} 
    - **Bid Size :** ${stock.bid_size} 
    - **Ask Size :** $${stock.ask_size}
  - **Transaction datetime  :** $${stock.trans_datetime}

    
    `).join("\n");

    const prompt = `
    You are a financial analyst AI assisting users with stock-related queries.
  
    **User Query:** 
    "${userPrompt}"
  
    **Stock Data Retrieved:**
    ${stockDetails}
  
    Based on the above data, provide a concise and insightful response, summarizing stock performance and answering the user’s query clearly.
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error getting ChatGPT response:", error);
        throw new Error("Failed to get ChatGPT response");
    }
}
main();

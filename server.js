
import express from 'express';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { QdrantClient } from '@qdrant/js-client-rest';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;

// --- MONGODB SETUP ---
const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  goal: String,
  observation: String,
  microAssist: String,
  state: String,
  confidence: String,
  vectorId: String
});
const AnalysisLog = mongoose.model('AnalysisLog', logSchema);

// New Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  goalContext: String
});
const ChatMessageLog = mongoose.model('ChatMessageLog', chatMessageSchema);

mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('✅ Connected to MongoDB (Insight Chat)'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- REDIS SETUP ---
const redisClient = createClient({
  url: process.env.REDIS_URL
});
redisClient.on('error', err => console.error('❌ Redis Client Error', err));
redisClient.connect().then(() => console.log('✅ Connected to Redis'));

// --- QDRANT SETUP ---
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});
const COLLECTION_NAME = 'screen_buddy_context';

// Ensure Qdrant Collection Exists
async function initQdrant() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.find(c => c.name === COLLECTION_NAME);
    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: { size: 768, distance: 'Cosine' }, // 768 is standard for Gemini embeddings
      });
      console.log('✅ Created Qdrant Collection:', COLLECTION_NAME);
    } else {
      console.log('✅ Qdrant Collection Active:', COLLECTION_NAME);
    }
  } catch (e) {
    console.error('⚠️ Qdrant Init Error:', e.message);
  }
}
initQdrant();

// --- ROUTES ---

// 1. GET RECENT ANALYSIS HISTORY
app.get('/api/history', async (req, res) => {
  try {
    const logs = await AnalysisLog.find().sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    console.error('History Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. CHAT HISTORY ROUTES
app.get('/api/chat/history', async (req, res) => {
  try {
    const logs = await ChatMessageLog.find().sort({ timestamp: 1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat/log', async (req, res) => {
  try {
    const { role, text, goalContext } = req.body;
    const newMessage = new ChatMessageLog({ role, text, goalContext });
    await newMessage.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. SEARCH CONTEXT (RAG via Qdrant)
app.post('/api/context', async (req, res) => {
  try {
    const { vector } = req.body;
    if (!vector) return res.status(400).json({ error: 'No vector provided' });

    const searchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: vector,
      limit: 3,
      with_payload: true,
    });

    const context = searchResult.map(item => ({
      score: item.score,
      observation: item.payload?.observation,
      microAssist: item.payload?.microAssist
    }));

    res.json({ context });
  } catch (error) {
    console.error('Context Search Error:', error);
    res.status(500).json({ error: error.message, context: [] });
  }
});

// 4. LOG ANALYSIS
app.post('/api/log', async (req, res) => {
  try {
    const { goal, observation, microAssist, state, confidence, vector } = req.body;
    
    // 1. MongoDB (Persistent storage)
    const newLog = new AnalysisLog({
      goal, observation, microAssist, state, confidence,
      vectorId: vector ? Date.now().toString() : null
    });
    await newLog.save();

    // 2. Redis (Hot cache for goal state)
    const redisKey = `last_action:${goal?.replace(/\s+/g, '_').toLowerCase() || 'unknown'}`;
    await redisClient.set(redisKey, JSON.stringify({ observation, microAssist, timestamp: Date.now() }), { EX: 3600 });

    // 3. Qdrant (Memory storage)
    if (vector) {
      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: false,
        points: [{
          id: Date.now(), 
          vector: vector,
          payload: {
            goal,
            observation,
            microAssist,
            state
          }
        }]
      });
    }

    res.json({ success: true, id: newLog._id });
  } catch (error) {
    console.error('Logging Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Insight Chat Backend running on port ${PORT}`);
});

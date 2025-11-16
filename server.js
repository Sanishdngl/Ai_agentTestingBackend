import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import OpenAI from "openai";
import Chat from "./models/Chat.js";

dotenv.config();
const app = express();

// ✅ BEST CORS CONFIGURATION - Allows multiple origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://ai-agent-testing-frontend.vercel.app",
  "https://ai-agent-testing-frontend-*.vercel.app",
  "https://ai-agent-testing-frontend-4zcy7jtnr-sanish-dangols-projects.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list or matches pattern
      if (
        allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin.includes('*')) {
            const pattern = allowedOrigin.replace('*', '.*');
            return new RegExp(pattern).test(origin);
          }
          return allowedOrigin === origin;
        })
      ) {
        return callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        return callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI route
app.post("/api/ask", async (req, res) => {
  const { prompt, userId } = req.body;

  try {
    let chat = await Chat.findOne({ userId });
    if (!chat) {
      chat = await Chat.create({ userId, messages: [] });
    }

    chat.messages.push({ role: "user", content: prompt });

    const recentMessages = chat.messages.slice(-5);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant in a MERN app." },
        ...recentMessages,
      ],
    });

    const reply = response.choices[0].message.content;

    chat.messages.push({ role: "assistant", content: reply });
    await chat.save();

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI request failed" });
  }
});

// Fetch chat history
app.post("/api/history", async (req, res) => {
  const { userId } = req.body;

  try {
    const chat = await Chat.findOne({ userId });
    res.json({ messages: chat ? chat.messages : [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Correct PORT handling (Render)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
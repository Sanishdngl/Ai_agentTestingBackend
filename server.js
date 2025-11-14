import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import OpenAI from "openai";
import Chat from "./models/Chat.js";

dotenv.config();
const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// connect to MongoDB (optional)
mongoose.connect(process.env.MONGO_URI).then(() => console.log("MongoDB Connected"));

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// example route: send prompt to AI

app.post("/api/ask", async (req, res) => {
  const { prompt, userId } = req.body;

  try {
    // find or create chat history
    let chat = await Chat.findOne({ userId });
    if (!chat) {
      chat = await Chat.create({ userId, messages: [] });
    }

    // push user message
    chat.messages.push({ role: "user", content: prompt });

    // include last 5 messages for context
    const recentMessages = chat.messages.slice(-5);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant in a MERN app." },
        ...recentMessages,
      ],
    });

    const reply = response.choices[0].message.content;

    // save AI response
    chat.messages.push({ role: "assistant", content: reply });
    await chat.save();

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI request failed" });
  }
});

// Fetch chat history for a user
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

// IMPORTANT: Render assigns port
const PORT = process.env.PORT || 5000;

app.listen(5000, () => console.log("Server running on port ${PORT}"));

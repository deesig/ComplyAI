import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv'; //npm install dotenv
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY; // Replace this with your actual Gemini API key

app.post('/api/ask', async (req, res) => {
  const { message } = req.body;
  console.log('🟢 Received message from React:', message);

  const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: message }
        ]
      }
    ]
  };

  console.log('Request Body:', requestBody);
  console.log('key', API_KEY);
  try {
    // ✅ Make sure this line exists!
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('🔵 Gemini response:', data);

    if (data.error) {
      console.error('❌ Gemini API error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No AI response.';
    res.json({ output });

  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(4000, () => {
  console.log('✅ Backend running at http://localhost:4000');
});

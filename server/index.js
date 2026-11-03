import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = Number(process.env.PORT || 3001);
const MAX_INPUT_LENGTH = 100_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(v => v.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
}));

// Lightweight per-process rate limit; use a shared store for multiple API instances.
const rateBuckets = new Map();
app.use('/api', (req, res, next) => {
  const now = Date.now();
  const current = rateBuckets.get(req.ip);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    rateBuckets.set(req.ip, { startedAt: now, count: 1 });
    return next();
  }
  current.count += 1;
  if (current.count > MAX_REQUESTS) return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  return next();
});

function getModel(modelName = 'gemini-2.0-flash') {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('AI service is not configured on the server.');
    error.status = 503;
    throw error;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: modelName });
}

function validateVideoId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    const error = new Error('Please provide a valid YouTube video URL.');
    error.status = 400;
    throw error;
  }
  return id;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/summarize/text', async (req, res) => {
  try {
    const { text, summaryLength = 'medium' } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Please enter text to summarize.' });
    if (text.length > MAX_INPUT_LENGTH) return res.status(413).json({ error: 'Text is too long. Keep it under 100,000 characters.' });
    if (!['short', 'medium', 'long'].includes(summaryLength)) return res.status(400).json({ error: 'Invalid summary length.' });
    const prompt = `Please provide a ${summaryLength} summary of the following text. The summary should be concise and capture the main points:\n\n${text}`;
    const result = await getModel().generateContent(prompt);
    return res.json({ summary: result.response.text() });
  } catch (error) {
    console.error('Text summarization failed:', error.message);
    return res.status(error.status || 502).json({ error: error.status ? error.message : 'AI summarization failed. Please try again.' });
  }
});

app.post('/api/summarize/youtube', async (req, res) => {
  try {
    const videoId = validateVideoId(req.body?.videoId);
    const { includeKeyPoints = false, includeQA = false, includeCodeExplanation = false } = req.body || {};
    if (![includeKeyPoints, includeQA, includeCodeExplanation].every(v => typeof v === 'boolean')) {
      return res.status(400).json({ error: 'Summary options must be boolean values.' });
    }
    if (!process.env.SUPADATA_API_KEY) return res.status(503).json({ error: 'Transcript service is not configured on the server.' });

    const transcriptResponse = await fetch(`https://api.supadata.ai/v1/youtube/transcript?id=${encodeURIComponent(videoId)}`, {
      headers: { 'x-api-key': process.env.SUPADATA_API_KEY },
    });
    if (!transcriptResponse.ok) {
      console.error('Supadata returned HTTP status:', transcriptResponse.status);
      return res.status(502).json({ error: 'Could not retrieve the transcript. Check the video URL or try another video.' });
    }
    const data = await transcriptResponse.json();
    if (!data?.content) return res.status(404).json({ error: 'No transcript is available for this video.' });
    const transcript = Array.isArray(data.content) ? data.content.map(item => item.text || '').join(' ') : data.content;
    if (typeof transcript !== 'string' || !transcript.trim()) return res.status(404).json({ error: 'No usable transcript is available.' });
    if (transcript.length > MAX_INPUT_LENGTH) return res.status(413).json({ error: 'This transcript is too long to summarize.' });

    const model = getModel('gemini-2.5-flash');
    const parts = [];
    const summary = await model.generateContent(`You are a YouTube video summarizer. Provide a concise summary of the following transcript within 250 words: ${transcript}`);
    parts.push(`## Summary\n${summary.response.text()}\n\n`);
    if (includeKeyPoints) {
      const r = await model.generateContent(`Extract and list the key points from the following video transcript: ${transcript}`);
      parts.push(`## Key Points\n${r.response.text()}\n\n`);
    }
    if (includeQA) {
      const r = await model.generateContent(`Based on the following video transcript, generate 5 relevant questions and their answers. Format each as 'Question: [question]' followed by 'Answer: [answer]' without any asterisks or additional formatting: ${transcript}`);
      parts.push(`## Questions and Answers\n${r.response.text()}\n\n`);
    }
    if (includeCodeExplanation) {
      const r = await model.generateContent(`Extract the code snippets from the following video transcript and provide a detailed explanation for each code snippet: ${transcript}`);
      parts.push(`## Code Explanation\n${r.response.text()}\n\n`);
    }
    return res.json({ summary: parts.join('') });
  } catch (error) {
    console.error('YouTube summarization failed:', error.message);
    return res.status(error.status || 502).json({ error: error.status ? error.message : 'Video summarization failed. Please try again.' });
  }
});

app.use((error, _req, res, _next) => {
  console.error('API request failed:', error.message);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});
app.listen(port, () => console.log(`Learning Assistant API listening on port ${port}`));

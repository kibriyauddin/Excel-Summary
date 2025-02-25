import React, { useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function YouTubeSummarizer() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [includeKeyPoints, setIncludeKeyPoints] = useState(false);
  const [includeQA, setIncludeQA] = useState(false);
  const [includeCodeExplanation, setIncludeCodeExplanation] = useState(false);

  const extractVideoId = (url: string) => {
    try {
      if (url.includes('youtu.be/')) {
        return url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('youtube.com/watch?v=')) {
        return url.split('v=')[1].split('&')[0];
      }
      throw new Error('Invalid YouTube URL');
    } catch (error) {
      throw new Error('Invalid YouTube URL');
    }
  };

  const handleGenerateSummary = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a YouTube video URL');
      return;
    }

    setLoading(true);
    try {
      const videoId = extractVideoId(videoUrl);
      
      // Initialize Gemini API
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Fetch video details using YouTube Data API
      const videoDetailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${import.meta.env.VITE_YOUTUBE_DATA_API_KEY}`
      );

      if (!videoDetailsResponse.ok) {
        throw new Error('Failed to fetch video details');
      }

      const videoDetails = await videoDetailsResponse.json();
      if (!videoDetails.items || videoDetails.items.length === 0) {
        throw new Error('Video not found');
      }

      // Use video description as content for summarization
      const transcript = videoDetails.items[0].snippet.description;

      // Generate summary using Gemini
      const summaryPrompt = `You are a YouTube video summarizer. Provide a concise summary of the following transcript within 250 words: ${transcript}`;
      const summaryResponse = await model.generateContent(summaryPrompt);
      let result = `## Summary\n${summaryResponse.response.text()}\n\n`;

      // Generate additional content based on options
      if (includeKeyPoints) {
        const keyPointsPrompt = `Extract and list the key points from the following video transcript: ${transcript}`;
        const keyPointsResponse = await model.generateContent(keyPointsPrompt);
        result += `## Key Points\n${keyPointsResponse.response.text()}\n\n`;
      }

      if (includeQA) {
        const qaPrompt = `Based on the following video transcript, generate 5 relevant questions and their answers. Format each as 'Question: [question]' followed by 'Answer: [answer]' without any asterisks or additional formatting: ${transcript}`;
        const qaResponse = await model.generateContent(qaPrompt);
        result += `## Questions and Answers\n${qaResponse.response.text()}\n\n`;
      }

      if (includeCodeExplanation) {
        const codePrompt = `Extract the code snippets from the following video transcript and provide a detailed explanation for each code snippet: ${transcript}`;
        const codeResponse = await model.generateContent(codePrompt);
        result += `## Code Explanation\n${codeResponse.response.text()}\n\n`;
      }

      setSummary(result);

      const { data: { session } } = await supabase.auth.getSession();
      
      // Store the result in Supabase
      const { error } = await supabase.from('processing_results').insert({
        type: 'summary',
        input_type: 'url',
        original_content: videoUrl,
        processed_content: result,
        user_id: session?.user?.id || null
      });

      if (error) throw error;
      toast.success('Summary generated successfully!');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="videoUrl" className="text-sm font-medium text-gray-700">Enter YouTube Video URL:</label>
          <div className="flex space-x-2">
            <input
              type="url"
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-700">Options:</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeKeyPoints}
                onChange={(e) => setIncludeKeyPoints(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Include Key Points</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeQA}
                onChange={(e) => setIncludeQA(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Include Q&A</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeCodeExplanation}
                onChange={(e) => setIncludeCodeExplanation(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Include Code Explanation</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={loading}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Generating Summary...
            </>
          ) : (
            <>
              <FileText className="mr-2" />
              Generate Summary
            </>
          )}
        </button>

        {videoUrl && (
          <div className="aspect-video w-full">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${extractVideoId(videoUrl)}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {summary && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="prose prose-blue max-w-none">
              {summary.split('##').map((section, index) => {
                if (!section.trim()) return null;
                const [title, ...content] = section.split('\n');
                return (
                  <div key={index} className="mb-8 last:mb-0">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{title.trim()}</h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {title.trim().toLowerCase().includes('key points') ? (
                        <ul className="list-disc list-inside space-y-2">
                          {content.join('\n').split('*').filter(point => point.trim()).map((point, i) => (
                            <li key={i} className="text-gray-700">{point.trim()}</li>
                          ))}
                        </ul>
                      ) : title.trim().toLowerCase().includes('questions and answers') ? (
                        <div className="space-y-4">
                          {content.join('\n').split('Question:').filter(qa => qa.trim()).map((qa, i) => {
                            const [question, answer] = qa.split('Answer:');
                            return (
                              <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                                <p className="font-semibold text-gray-900 mb-2">Q: {question.trim()}</p>
                                <p className="text-gray-700">A: {answer?.trim()}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : title.trim().toLowerCase().includes('code explanation') ? (
                        <div className="space-y-4">
                          {content.join('\n').split('```').map((block, i) => (
                            <div key={i} className={`${i % 2 === 1 ? 'bg-gray-800 text-white font-mono p-4 rounded-lg' : 'text-gray-700'}`}>
                              {block.trim()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {content.join('\n').trim()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
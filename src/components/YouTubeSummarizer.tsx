import React, { useState } from 'react';
import { Loader2, FileText, Youtube } from 'lucide-react';
import { supabase } from '../supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function YouTubeSummarizer() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
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
      setError('Please enter a YouTube video URL');
      return;
    }

    setError('');
    setSummary('');

    setLoading(true);
    try {
      const videoId = extractVideoId(videoUrl);
      
      // Initialize Gemini API with 2.5 Flash model
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Fetch transcript using Supadata API
      const transcriptResponse = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?id=${videoId}`,
        {
          headers: {
            'x-api-key': import.meta.env.VITE_SUPADATA_API_KEY
          }
        }
      );

      if (!transcriptResponse.ok) {
        const errorText = await transcriptResponse.text();
        throw new Error(`Failed to fetch transcript from Supadata API: ${transcriptResponse.status} - ${errorText}`);
      }

      const transcriptData = await transcriptResponse.json();

      if (!transcriptData || !transcriptData.content) {
        throw new Error('No transcript available for this video');
      }

      // Join transcript segments into a single text
      const transcript = Array.isArray(transcriptData.content)
        ? transcriptData.content.map((item: any) => item.text).join(' ')
        : transcriptData.content;

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

      // Try to store the result in Supabase (optional, don't fail if it errors)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const { error: dbError } = await supabase.from('processing_results').insert({
          type: 'summary',
          input_type: 'url',
          original_content: videoUrl,
          processed_content: result,
          user_id: session?.user?.id || null
        });

        if (dbError) {
          console.warn('Failed to store result in database:', dbError);
        }
      } catch (dbErr) {
        console.warn('Database storage error:', dbErr);
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-3">
          <label htmlFor="videoUrl" className="text-sm font-medium text-gray-700">Enter YouTube Video URL:</label>
          <div className="relative">
            <input
              type="url"
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full p-4 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 pr-12"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Youtube className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <label className="text-sm font-medium text-gray-700">Summary Options:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center p-4 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl space-x-3 cursor-pointer hover:border-indigo-500 transition-all duration-200">
              <input
                type="checkbox"
                checked={includeKeyPoints}
                onChange={(e) => setIncludeKeyPoints(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 transition-colors"
              />
              <span className="text-gray-700">Key Points</span>
            </label>
            <label className="flex items-center p-4 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl space-x-3 cursor-pointer hover:border-indigo-500 transition-all duration-200">
              <input
                type="checkbox"
                checked={includeQA}
                onChange={(e) => setIncludeQA(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 transition-colors"
              />
              <span className="text-gray-700">Q&A</span>
            </label>
            <label className="flex items-center p-4 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl space-x-3 cursor-pointer hover:border-indigo-500 transition-all duration-200">
              <input
                type="checkbox"
                checked={includeCodeExplanation}
                onChange={(e) => setIncludeCodeExplanation(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 transition-colors"
              />
              <span className="text-gray-700">Code Explanation</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/50"
        >
          <div className="flex items-center justify-center space-x-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Summary...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>Generate Summary</span>
              </>
            )}
          </div>
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {videoUrl && (
          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${extractVideoId(videoUrl)}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}

        {summary && (
          <div className="mt-8 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {summary.split('##').map((section, index) => {
                if (!section.trim()) return null;
                const [title, ...content] = section.split('\n');
                return (
                  <div key={index} className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      {title.trim()}
                    </h2>
                    <div className="prose prose-indigo max-w-none">
                      {title.trim().toLowerCase().includes('key points') ? (
                        <ul className="space-y-2">
                          {content.join('\n').split('*').filter(point => point.trim()).map((point, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500" />
                              <span className="text-gray-700">{point.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      ) : title.trim().toLowerCase().includes('questions and answers') ? (
                        <div className="space-y-4">
                          {content.join('\n').split('Question:').filter(qa => qa.trim()).map((qa, i) => {
                            const [question, answer] = qa.split('Answer:');
                            return (
                              <div key={i} className="bg-white/80 rounded-lg p-4 shadow-sm">
                                <p className="font-medium text-indigo-900 mb-2">Q: {question.trim()}</p>
                                <p className="text-gray-700">A: {answer?.trim()}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : title.trim().toLowerCase().includes('code explanation') ? (
                        <div className="space-y-4">
                          {content.join('\n').split('```').map((block, i) => (
                            <div key={i} className={i % 2 === 1 ? 'bg-gray-900 text-gray-100 font-mono p-4 rounded-lg overflow-x-auto' : 'text-gray-700'}>
                              {block.trim()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-700 leading-relaxed">
                          {content.join('\n').trim()}
                        </div>
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

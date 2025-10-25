import React, { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

export default function TextSummarizer() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [summaryLength, setSummaryLength] = useState('medium');

  const handlePdfFile = async (file: File) => {
    setLoading(true); // Set loading state when starting PDF processing
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      let fullText = '';
  
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item: any) => item.str && item.str.trim())
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
  
      setText(fullText.trim());
      setError('');
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Failed to process PDF file. Please ensure the file is not corrupted or password protected.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setText(result.value.trim());
      setError('');
    } catch (err) {
      console.error('Error processing DOC:', err);
      setError('Failed to process DOC file');
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      try {
        if (file.type === 'application/pdf') {
          await handlePdfFile(file);
        } else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          await handleDocFile(file);
        } else {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const content = e.target?.result as string;
              setText(content);
              setError('');
            } catch (err) {
              console.error('Error reading file content:', err);
              setError('Failed to read file content');
            }
          };
          reader.readAsText(file);
        }
      } catch (err) {
        console.error('Error handling file:', err);
        setError('Error handling file');
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });

  const handleSummarize = async () => {
    if (!text.trim()) {
      setError('Please enter or upload text to summarize');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Initialize Gemini API
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // Prepare prompt based on summary length
      const lengthPrompt = `Please provide a ${summaryLength} summary of the following text. The summary should be concise and capture the main points:`;
      const prompt = `${lengthPrompt}\n\n${text}`;

      // Generate summary using Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summaryText = response.text();
      setSummary(summaryText);
      
      // Try to store the result in Supabase (optional, don't fail if it errors)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const { error: dbError } = await supabase.from('processing_results').insert({
          type: 'summary',
          input_type: 'text',
          original_content: text,
          processed_content: summaryText,
          ...(session?.user?.id ? { user_id: session.user.id } : {})
        });

        if (dbError) {
          console.warn('Failed to store result in database:', dbError);
        }
      } catch (dbErr) {
        console.warn('Database storage error:', dbErr);
      }
    } catch (err) {
      console.error('Summarization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to summarize text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col space-y-6">
        <div 
          {...getRootProps()} 
          className="border-2 border-dashed border-indigo-300 bg-white/50 backdrop-blur-sm rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-all duration-200 group"
        >
          <input {...getInputProps()} />
          <Upload className="w-16 h-16 mx-auto mb-4 text-indigo-500 group-hover:scale-110 transition-transform duration-200" />
          {isDragActive ? (
            <p className="text-indigo-600 font-medium">Drop your file here...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-700 font-medium">Drag & drop a document, or click to select</p>
              <p className="text-sm text-gray-500">Supports TXT, PDF, DOC, DOCX, CSV, JSON, and MD files</p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3">
          <label htmlFor="text" className="text-sm font-medium text-gray-700">Or paste your text here:</label>
          <div className="relative">
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[200px] p-4 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-y"
              placeholder="Enter your text here..."
            />
            <div className="absolute bottom-3 right-3 text-sm text-gray-500">
              {text.length} characters
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <label className="text-sm font-medium text-gray-700">Summary Length:</label>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setSummaryLength('short')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                summaryLength === 'short'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Short
            </button>
            <button
              onClick={() => setSummaryLength('medium')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                summaryLength === 'medium'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setSummaryLength('long')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                summaryLength === 'long'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Long
            </button>
          </div>
        </div>

        <button
          onClick={handleSummarize}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/50"
        >
          <div className="flex items-center justify-center space-x-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>Summarize Text</span>
              </>
            )}
          </div>
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {summary && (
          <div className="mt-8 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="prose prose-indigo max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

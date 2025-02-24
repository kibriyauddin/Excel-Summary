import React, { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
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
      toast.success('PDF file processed successfully!', {
        position: 'top-center',
        duration: 2000
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF file. Please ensure the file is not corrupted or password protected.', {
        position: 'top-center',
        duration: 3000
      });
    } finally {
      setLoading(false); // Reset loading state regardless of success or failure
    }
  };

  const handleDocFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setText(result.value.trim());
      toast.success('DOC file processed successfully!', {
        position: 'top-center',
        duration: 2000
      });
    } catch (error) {
      console.error('Error processing DOC:', error);
      toast.error('Failed to process DOC file', {
        position: 'top-center',
        duration: 3000
      });
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
              toast.success('File uploaded successfully!', {
                position: 'top-center',
                duration: 2000
              });
            } catch (error) {
              console.error('Error reading file content:', error);
              toast.error('Failed to read file content', {
                position: 'top-center',
                duration: 3000
              });
            }
          };
          reader.readAsText(file);
        }
      } catch (error) {
        console.error('Error handling file:', error);
        toast.error('Error handling file', {
          position: 'top-center',
          duration: 3000
        });
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
      toast.error('Please enter or upload text to summarize');
      return;
    }

    setLoading(true);
    try {
      // Initialize Gemini API
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Prepare prompt based on summary length
      const lengthPrompt = `Please provide a ${summaryLength} summary of the following text. The summary should be concise and capture the main points:`;
      const prompt = `${lengthPrompt}\n\n${text}`;

      // Generate summary using Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summaryText = response.text();
      setSummary(summaryText);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      // Store the result in Supabase
      const { error } = await supabase.from('processing_results').insert({
        type: 'summary',
        input_type: 'text',
        original_content: text,
        processed_content: summaryText,
        // Only set user_id if authenticated
        ...(session?.user?.id ? { user_id: session.user.id } : {})
      });

      if (error) throw error;
      toast.success('Text summarized successfully!');
    } catch (error) {
      console.error('Summarization failed:', error);
      toast.error('Failed to summarize text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div {...getRootProps()} className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center cursor-pointer hover:border-blue-600 transition-colors">
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the file here...</p>
          ) : (
            <p className="text-gray-600">Drag & drop a document, or click to select</p>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <label htmlFor="text" className="text-sm font-medium text-gray-700">Or paste your text here:</label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your text here..."
          />
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setSummaryLength('short')}
            className={`px-4 py-2 rounded-lg ${summaryLength === 'short' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Short
          </button>
          <button
            onClick={() => setSummaryLength('medium')}
            className={`px-4 py-2 rounded-lg ${summaryLength === 'medium' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Medium
          </button>
          <button
            onClick={() => setSummaryLength('long')}
            className={`px-4 py-2 rounded-lg ${summaryLength === 'long' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Long
          </button>
        </div>

        <button
          onClick={handleSummarize}
          disabled={loading}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Summarizing...
            </>
          ) : (
            <>
              <FileText className="mr-2" />
              Summarize Text
            </>
          )}
        </button>

        {summary && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Summary:</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
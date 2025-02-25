import React, { useState } from 'react';
import { FileText, Youtube } from 'lucide-react';
import TextSummarizer from './components/TextSummarizer';
import toast, { Toaster } from 'react-hot-toast';
import YouTubeSummarizer from './components/YouTubeSummarizer';

function App() {
  const [activeTab, setActiveTab] = useState<'summarizer' | 'youtube'>('summarizer');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Toaster position="top-right" />
      
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 py-6">Learning Assistant</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('summarizer')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'summarizer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="inline-block w-5 h-5 mr-2" />
                Text Summarizer
              </button>
              <button
                onClick={() => setActiveTab('youtube')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'youtube'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Youtube className="inline-block w-5 h-5 mr-2" />
                YouTube Summary
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'summarizer' ? <TextSummarizer /> : <YouTubeSummarizer />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
import React, { useState } from 'react';
import { FileText, Youtube, Brain, Sparkles } from 'lucide-react';
import TextSummarizer from './components/TextSummarizer';
import toast, { Toaster } from 'react-hot-toast';
import YouTubeSummarizer from './components/YouTubeSummarizer';

function App() {
  const [activeTab, setActiveTab] = useState<'summarizer' | 'youtube'>('summarizer');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Toaster position="top-right" />
      
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Learning Assistant
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Powered by AI</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('summarizer')}
                className={`relative flex-1 py-4 px-1 text-center transition-all duration-200 ${
                  activeTab === 'summarizer'
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Text Summarizer</span>
                </div>
                {activeTab === 'summarizer' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('youtube')}
                className={`relative flex-1 py-4 px-1 text-center transition-all duration-200 ${
                  activeTab === 'youtube'
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Youtube className="w-5 h-5" />
                  <span className="font-medium">YouTube Summary</span>
                </div>
                {activeTab === 'youtube' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}
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
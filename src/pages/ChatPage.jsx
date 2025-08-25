import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from 'react-markdown'
import SettingsModal from '@/components/SettingsModal';
import { Loader2, PlusCircle, ChevronLeft, ChevronRight, Search, Download } from "lucide-react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from "@/components/ui/use-toast"
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const ChatPage = () => {
  const [analysisParams, setAnalysisParams] = useState(() => {
    const savedParams = localStorage.getItem('analysis_params');
    return savedParams ? JSON.parse(savedParams) : {};
  });
  const [conversations, setConversations] = useState(() => {
    const savedConversations = localStorage.getItem('conversations');
    return savedConversations ? JSON.parse(savedConversations) : [{ id: Date.now(), title: 'New Analysis', messages: [] }];
  });
  const [currentConversationIndex, setCurrentConversationIndex] = useState(0);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollAreaRef = useRef(null);
  const eventSourceRef = useRef(null);
  const navigate = useNavigate();

  // Stock analysis state
  // Track active jobId, initialize from localStorage if present
  const [activeJobId, setActiveJobId] = useState(() => {
    const cached = localStorage.getItem('activeJob');
    if (cached) {
      try {
        const { id, status } = JSON.parse(cached);
        return status === 'running' ? id : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [eventSource, setEventSource] = useState(null);
  const [availableFiles, setAvailableFiles] = useState({});

  // FastAPI base URL
  const API_BASE_URL = 'http://localhost:8080';

  const filteredConversations = conversations.filter(conversation =>
    conversation.title && conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
    localStorage.setItem('analysis_params', JSON.stringify(analysisParams));
  }, [conversations, analysisParams]);

  // Cleanup effect for SSE connections - only run on component unmount
  // Robust background auto-reconnect for SSE using localStorage
  useEffect(() => {
    let reconnectInterval = null;

    // Helper: check backend job status
    const checkAndReconnect = async () => {
      const cached = localStorage.getItem('activeJob');
      if (!cached) return;
      let parsed;
      try {
        parsed = JSON.parse(cached);
      } catch {
        return;
      }
      if (!parsed.id || parsed.status !== 'running') return;
      // If already connected, do nothing
      if (eventSourceRef.current) return;
      // Ping backend for job status
      try {
        const resp = await fetch(`${API_BASE_URL}/jobs/${parsed.id}/status`);
        if (resp.status === 404) {
          // Job not found: treat as finished and clear cache
          localStorage.removeItem('activeJob');
          setActiveJobId(null);
          setIsStreaming(false);
          return;
        }
        if (!resp.ok) throw new Error('Status check failed');
        const status = await resp.json();
        if (status.status === 'running' || status.status === 'pending') {
          // Reconnect SSE
          setActiveJobId(parsed.id);
          setIsStreaming(true);
          startJobMonitoring(parsed.id, { fromReconnect: true });
        } else {
          // Job finished, clear cache
          localStorage.removeItem('activeJob');
          setActiveJobId(null);
          setIsStreaming(false);
        }
      } catch (err) {
        // Network error, try again later
        console.warn('Job status check failed:', err);
      }
    };

    // On mount, check for cached job and try to reconnect
    checkAndReconnect();
    // Also check every 15 seconds in background
    reconnectInterval = setInterval(checkAndReconnect, 15000);

    // Also reconnect on tab visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndReconnect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(reconnectInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (eventSourceRef.current) {
        console.log('🧹 Cleaning up SSE connection on unmount');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Parse user input to extract ONLY the mandatory ticker parameter
  const parseAnalysisRequest = (input) => {
    const text = input.trim();
    
    // Look for "TICKER, company" pattern first
    const tickerCommaPattern = text.match(/\b([A-Z]{1,5})\s*,\s*(.+)/i);
    
    if (tickerCommaPattern) {
      const ticker = tickerCommaPattern[1].toUpperCase();
      const company = tickerCommaPattern[2].trim();
      
      // Build request with mandatory parameters + user's settings
      const request = {
        ticker,
        query: input,
        company
      };
      
      // Add all optional parameters from user settings (no defaults!)
      Object.keys(analysisParams).forEach(key => {
        if (analysisParams[key] !== undefined && analysisParams[key] !== null && analysisParams[key] !== '') {
          request[key] = analysisParams[key];
        }
      });
      
      return request;
    }
    
    // Fallback: Look for standalone ticker pattern
    const upperText = text.toUpperCase();
    const tickerMatch = upperText.match(/\b([A-Z]{1,5})\b/);
    
    if (tickerMatch) {
      const ticker = tickerMatch[1];
      
      // Build request with mandatory parameters + user's settings
      const request = {
        ticker,
        query: input
      };
      
      // Add all optional parameters from user settings (no defaults!)
      Object.keys(analysisParams).forEach(key => {
        if (analysisParams[key] !== undefined && analysisParams[key] !== null && analysisParams[key] !== '') {
          request[key] = analysisParams[key];
        }
      });
      
      return request;
    }
    
    return null;
  };

  // Start stock analysis using your FastAPI
  const startStockAnalysis = async (analysisRequest) => {
    try {
      console.log('🚀 Starting stock analysis:', analysisRequest);
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisRequest)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.log('✅ Analysis job started:', result);
      setActiveJobId(result.job_id);
      // Save to localStorage for reconnect
      localStorage.setItem('activeJob', JSON.stringify({ id: result.job_id, started: Date.now(), status: 'running' }));
      startJobMonitoring(result.job_id);
      return result;
    } catch (error) {
      console.error('❌ Failed to start analysis:', error);
      throw error;
    }
  };

  // Monitor job progress with SSE
  // Optionally pass { fromReconnect: true } to suppress duplicate connect messages
  const startJobMonitoring = (jobId, opts = {}) => {
    console.log('📡 Starting job monitoring for:', jobId);
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('🔄 Closing previous SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    const es = new EventSource(`${API_BASE_URL}/jobs/${jobId}/logs/stream`);
    
    es.onopen = () => {
      console.log('✅ SSE connection opened');
      if (!opts.fromReconnect) {
        addAssistantMessage(`🔗 **Connected to analysis job ${jobId}**`);
      } else {
        addAssistantMessage(`🔄 **Reconnected to analysis job ${jobId}**`);
      }
    };
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('� SSE message:', data);
        
        switch (data.type) {
          case 'status':
            if (data.progress) {
              addAssistantMessage(`📊 **Status Update:** ${data.progress}`);
            }
            break;
            
          case 'log':
            addAssistantMessage(`📝 ${data.message}`);
            break;
            
          case 'latest':
            addAssistantMessage(`🔄 **Latest:** ${data.message}`);
            // Fetch detailed status to check for available files
            checkAvailableFiles(jobId);
            break;
            
          case 'final':
            addAssistantMessage(`🏁 **Analysis Complete:** ${data.message}`);
            setIsStreaming(false);
            setActiveJobId(null);
            checkAvailableFiles(jobId);
            es.close();
            // Mark job as finished in localStorage
            localStorage.removeItem('activeJob');
            break;
        }
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error);
      }
    };
    
    es.onerror = async (error) => {
      console.error('❌ SSE connection error:', error);
      console.log('SSE readyState:', es.readyState); // 0=CONNECTING, 1=OPEN, 2=CLOSED
      console.log('SSE URL:', es.url);

      // Always check backend job status on SSE close/error
      let finished = false;
      try {
        const resp = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`);
        if (resp.ok) {
          const status = await resp.json();
          if (status.status === 'finished' || status.status === 'completed' || status.status === 'success') {
            finished = true;
          }
        }
      } catch (err) {
        console.warn('Job status check after SSE close failed:', err);
      }

      if (finished) {
        addAssistantMessage('🏁 **Analysis Complete:** (detected on connection close)');
        setIsStreaming(false);
        setActiveJobId(null);
        localStorage.removeItem('activeJob');
        checkAvailableFiles(jobId);
        es.close();
      } else {
        // Only show error message if connection was actually established
        if (es.readyState === 2) { // CLOSED
          addAssistantMessage('❌ **Connection Lost:** Analysis monitoring disconnected. Job continues running in background.');
        } else {
          addAssistantMessage('❌ **Connection Error:** Could not connect to analysis service. Job may still be running.');
        }
        setIsStreaming(false);
      }
    };
    
    // Store in both state and ref
    setEventSource(es);
    eventSourceRef.current = es;
  };

  // Check for available download files
  const checkAvailableFiles = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/status/detailed`);
      if (response.ok) {
        const status = await response.json();
        if (status.files_available) {
          setAvailableFiles(status.files_available);
          
          // Show available downloads
          const availableDownloads = Object.entries(status.files_available)
            .filter(([_, available]) => available === true)
            .map(([type, _]) => type);
            
          if (availableDownloads.length > 0) {
            addAssistantMessage(`📥 **Downloads Available:** ${availableDownloads.join(', ')}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking file availability:', error);
    }
  };

  // Handle file downloads
  const handleDownload = async (jobId, fileType) => {
    try {
      console.log(`📥 Downloading ${fileType} for job ${jobId}`);
      
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/download/${fileType}`);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${jobId}_${fileType}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      addAssistantMessage(`✅ **Downloaded:** ${filename}`);
      
    } catch (error) {
      console.error(`❌ Download failed:`, error);
      addAssistantMessage(`❌ **Download Failed:** ${error.message}`);
    }
  };

  // Add message to conversation
  const addAssistantMessage = (content) => {
    setConversations((prevConversations) => {
      const updatedConversations = [...prevConversations];
      updatedConversations[currentConversationIndex].messages.push({
        role: 'assistant',
        content,
        timestamp: new Date().toISOString()
      });
      return updatedConversations;
    });
  };

  // Generate title based on the user's query
  const generateTitle = (userMessage) => {
    const text = userMessage.toLowerCase();
    
    if (text.includes('analyze') || text.includes('analysis')) {
      const tickerMatch = userMessage.match(/\b([A-Z]{1,5})\b/);
      return tickerMatch ? `${tickerMatch[1]} Analysis` : 'Stock Analysis';
    }
    
    const words = userMessage.split(' ').slice(0, 3).join(' ');
    return words.length > 20 ? words.substring(0, 20) + '...' : words;
  };

  const startNewConversation = () => {
    setConversations([...conversations, { id: Date.now(), title: 'New Analysis', messages: [] }]);
    setCurrentConversationIndex(conversations.length);
  };

  const switchConversation = (index) => {
    setCurrentConversationIndex(index);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Main message handler - now uses your FastAPI instead of OpenAI
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input };
    setConversations((prevConversations) => {
      const updatedConversations = [...prevConversations];
      updatedConversations[currentConversationIndex].messages.push(userMessage);
      return updatedConversations;
    });

    const currentInput = input;
    setInput('');
    setIsStreaming(true);

    try {
      // Parse the user input to extract analysis parameters
      const analysisRequest = parseAnalysisRequest(currentInput);
      
      if (!analysisRequest) {
        // If no ticker detected, provide helpful guidance
        addAssistantMessage(`I'm your **Stock Analysis Assistant**! 📊 

**How to get started:**
• Enter a stock ticker symbol (e.g., **AAPL**, **NVDA**, **TSLA**)
• For best results, use format: **TICKER, Company Name**
  - Example: **AAPL, Apple Inc.**
  - Example: **NVDA, NVIDIA Corporation**
  - Example: **TSLA, Tesla Inc.**

⚙️ **Configure Analysis Parameters:**
Click the **Settings** ⚙️ button above to customize optional parameters:
• Analysis pipeline, financial models, article filtering, etc.
• All API parameters can be configured in Settings
• Leave settings empty to use API defaults

🎯 **Current Settings:** ${Object.keys(analysisParams).length > 0 ? `${Object.keys(analysisParams).length} parameters configured` : 'Using API defaults'}`);
        setIsStreaming(false);
        return;
      }

      // Start the analysis using your FastAPI
      addAssistantMessage(`🚀 **Starting Analysis** for **${analysisRequest.ticker}**${analysisRequest.company ? ` (${analysisRequest.company})` : ''}

📋 **Request Parameters:**
\`\`\`json
${JSON.stringify(analysisRequest, null, 2)}
\`\`\`

⚡ **Connecting to analysis service...**`);
      
      const result = await startStockAnalysis(analysisRequest);
      
      // Generate title for new conversations
      if (conversations[currentConversationIndex].title === 'New Analysis') {
        const newTitle = generateTitle(currentInput);
        setConversations((prevConversations) => {
          const updatedConversations = [...prevConversations];
          updatedConversations[currentConversationIndex].title = newTitle;
          return updatedConversations;
        });
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      addAssistantMessage(`❌ **Analysis Failed:** ${error.message}\n\nPlease try again or check if the ticker symbol is valid.`);
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-chatbg overflow-x-hidden">
      <div className="relative">
        <Collapsible open={isSidebarOpen} onOpenChange={setIsSidebarOpen} className="bg-white border-r h-full">
          <CollapsibleContent className="w-64 p-4 h-full flex flex-col">
            <Button onClick={startNewConversation} className="w-full mb-4">
              <PlusCircle className="mr-2 h-4 w-4" /> New Analysis
            </Button>
            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <ScrollArea className="flex-1">
              {filteredConversations.map((conversation, index) => (
                <Button
                  key={conversation.id}
                  onClick={() => switchConversation(index)}
                  variant={currentConversationIndex === index ? "secondary" : "ghost"}
                  className="w-full justify-start mb-2 truncate"
                >
                  {conversation.title}
                </Button>
              ))}
            </ScrollArea>
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`absolute top-4 ${isSidebarOpen ? 'left-64' : 'left-0'} transition-all duration-300`}
            >
              {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>
      <div className="flex flex-col flex-grow h-full">
        <div className="flex justify-between items-center p-4 bg-white border-b">
          <div className="text-lg font-semibold text-gray-700">
            Stock Analysis Assistant
            {activeJobId && (
              <span className="ml-2 text-sm text-blue-600">
                • Job {activeJobId.slice(0, 8)} running...
              </span>
            )}
          </div>
          <SettingsModal
            analysisParams={analysisParams}
            setAnalysisParams={setAnalysisParams}
          />
        </div>
        <div className="flex-1 overflow-hidden min-w-0">
          <ScrollArea className="h-full p-4 overflow-x-hidden" ref={scrollAreaRef}>
            {conversations[currentConversationIndex].messages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg shadow-md max-w-[80%] break-words break-long-words ${
                  message.role === 'user' ? 'bg-usermsg text-white' : 'bg-assistantmsg text-gray-800'
                }`}>
                  <ReactMarkdown
                    className="prose max-w-none dark:prose-invert break-words overflow-hidden break-long-words"
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <div className="overflow-x-auto">
                            <SyntaxHighlighter
                              {...props}
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ margin: 0, maxWidth: '100%' }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code {...props} className={`${className} break-all`}>
                            {children}
                          </code>
                        )
                      },
                      pre({node, children, ...props}) {
                        return (
                          <pre {...props} className="whitespace-pre-wrap break-words overflow-x-auto">
                            {children}
                          </pre>
                        )
                      },
                      p({node, children, ...props}) {
                        return (
                          <p {...props} className="break-words">
                            {children}
                          </p>
                        )
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {isStreaming && index === conversations[currentConversationIndex].messages.length - 1 && message.role === 'assistant' && (
                    <div className="mt-2 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm opacity-75">Analyzing...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Download buttons for available files */}
            {Object.keys(availableFiles).length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">📥 Available Downloads</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(availableFiles)
                    .filter(([_, available]) => available === true)
                    .map(([fileType, _]) => (
                      <Button
                        key={fileType}
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(activeJobId, fileType)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {fileType.replace(/-/g, ' ').replace(/_/g, ' ')}
                      </Button>
                    ))
                  }
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
        <div className="p-4 bg-white border-t shadow-md">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter ticker or 'TICKER, company' for analysis (e.g., AAPL, Apple Inc. or NVDA, NVIDIA Corporation)"
              className="flex-grow"
              disabled={isStreaming}
            />
            <Button type="submit" disabled={isStreaming} className="bg-usermsg hover:bg-blue-600">
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
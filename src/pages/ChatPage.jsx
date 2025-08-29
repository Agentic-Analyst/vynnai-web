import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from 'react-markdown';
import SettingsModal from '@/components/SettingsModal';
import { Loader2, PlusCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VariableSizeList as List } from 'react-window';
import { api, buildDownloadEntries, downloadByEntry } from '@/lib/api';

const ChatPage = () => {
  // ---------- Local state ----------
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

  // virtualization
  const listRef = useRef(null);
  const listContainerRef = useRef(null);
  const [listHeight, setListHeight] = useState(400);
  const rowHeightsRef = useRef({});
  const DEFAULT_ROW_HEIGHT = 56;

  // job state
  const [activeJobId, setActiveJobId] = useState(() => {
    const cached = localStorage.getItem('activeJob');
    if (cached) {
      try {
        const { id, status } = JSON.parse(cached);
        return status === 'running' ? id : null;
      } catch { return null; }
    }
    return null;
  });
  const eventSourceRef = useRef(null);
  const [availableFiles, setAvailableFiles] = useState({});
  const [lastJobId, setLastJobId] = useState(null);
  const downloadsPostedRef = useRef(new Set()); // jobIds we've already posted

  const filteredConversations = conversations.filter(c =>
    c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---------- Persistence ----------
  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
    localStorage.setItem('analysis_params', JSON.stringify(analysisParams));
  }, [conversations, analysisParams]);

  // ---------- Reconnect SSE if needed ----------
  useEffect(() => {
    let reconnectInterval = null;

    const checkAndReconnect = async () => {
      const cached = localStorage.getItem('activeJob');
      if (!cached) return;
      let parsed;
      try { parsed = JSON.parse(cached); } catch { return; }
      if (!parsed.id || parsed.status !== 'running') return;
      if (eventSourceRef.current) return;

      try {
        const status = await api.getJobStatus(parsed.id);
        if (!status) {
          localStorage.removeItem('activeJob');
          setActiveJobId(null);
          setIsStreaming(false);
          return;
        }
        if (status.status === 'running' || status.status === 'pending') {
          setActiveJobId(parsed.id);
          setIsStreaming(true);
          startJobMonitoring(parsed.id, { fromReconnect: true });
        } else {
          localStorage.removeItem('activeJob');
          setActiveJobId(null);
          setIsStreaming(false);
        }
      } catch {
        /* ignore */
      }
    };

    checkAndReconnect();
    reconnectInterval = setInterval(checkAndReconnect, 15000);

    const onVis = () => document.visibilityState === 'visible' && checkAndReconnect();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(reconnectInterval);
      document.removeEventListener('visibilitychange', onVis);
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch {}
        eventSourceRef.current = null;
      }
    };
  }, []);

  // ---------- Virtual list sizing ----------
  useEffect(() => {
    if (!listContainerRef.current) return;
    const el = listContainerRef.current;

    const ro = new ResizeObserver(() => {
      setListHeight(el.clientHeight);
      const msgs = conversations[currentConversationIndex]?.messages ?? [];
      if (listRef.current && msgs.length) {
        listRef.current.scrollToItem(msgs.length - 1, 'end');
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [currentConversationIndex, conversations]);

  useEffect(() => {
    const msgs = conversations[currentConversationIndex]?.messages ?? [];
    if (listRef.current && msgs.length > 0) {
      listRef.current.scrollToItem(msgs.length - 1, 'end');
    }
  }, [conversations, currentConversationIndex]);

  // ---------- Helpers ----------
  const parseAnalysisRequest = (textIn) => {
    const text = textIn.trim();
    const tickerCommaPattern = text.match(/\b([A-Z]{1,5})\s*,\s*(.+)/i);
    if (tickerCommaPattern) {
      const ticker = tickerCommaPattern[1].toUpperCase();
      const company = tickerCommaPattern[2].trim();
      const req = { ticker, query: textIn, company };
      Object.keys(analysisParams).forEach(k => {
        const v = analysisParams[k];
        if (v !== undefined && v !== null && v !== '') req[k] = v;
      });
      return req;
    }
    const upperText = text.toUpperCase();
    const tickerMatch = upperText.match(/\b([A-Z]{1,5})\b/);
    if (tickerMatch) {
      const ticker = tickerMatch[1];
      const req = { ticker, query: textIn };
      Object.keys(analysisParams).forEach(k => {
        const v = analysisParams[k];
        if (v !== undefined && v !== null && v !== '') req[k] = v;
      });
      return req;
    }
    return null;
  };

  // virtual list nudge
  const bumpListToBottom = () => {
    requestAnimationFrame(() => {
      const count = conversations[currentConversationIndex]?.messages?.length || 0;
      if (count > 0) {
        listRef.current?.resetAfterIndex(count - 1, true);
        listRef.current?.scrollToItem(count - 1, 'end');
      }
    });
  };

  // log batch bubble
  const addAssistantLogBatch = (lines) => {
    if (!Array.isArray(lines) || lines.length === 0) return;
    const nowIso = new Date().toISOString();
    setConversations(prev => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex];
      const msgs = [...(convo.messages || [])];
      const last = msgs[msgs.length - 1];

      if (last && last.role === 'assistant' && last.kind === 'logbatch') {
        msgs[msgs.length - 1] = {
          ...last,
          lines: (last.lines || []).concat(lines),
          content: ((last.lines || []).concat(lines)).join('\n'),
          timestamp: nowIso
        };
      } else {
        msgs.push({
          role: 'assistant',
          kind: 'logbatch',
          lines: [...lines],
          content: lines.join('\n'),
          timestamp: nowIso
        });
      }
      updated[currentConversationIndex] = { ...convo, messages: msgs };
      return updated;
    });
    bumpListToBottom();
  };

  const addAssistantMessage = (content) => {
    const COALESCE_MS = 3000;
    setConversations(prev => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex] ?? { id: Date.now(), title: 'New Analysis', messages: [] };
      const msgs = [...(convo.messages || [])];

      const nowIso = new Date().toISOString();
      const last = msgs[msgs.length - 1];
      const canCoalesce =
        last && last.role === 'assistant' && !last.kind && last.timestamp &&
        (Date.now() - new Date(last.timestamp).getTime() <= COALESCE_MS);

      if (canCoalesce) {
        msgs[msgs.length - 1] = { ...last, content: `${last.content}\n${content}`, timestamp: nowIso };
      } else {
        msgs.push({ role: 'assistant', content, timestamp: nowIso });
      }
      updated[currentConversationIndex] = { ...convo, messages: msgs };
      return updated;
    });
    bumpListToBottom();
  };

  const addDownloadsMessage = (jobId, entriesObject) => {
    if (downloadsPostedRef.current.has(jobId)) return;
    downloadsPostedRef.current.add(jobId);

    const nowIso = new Date().toISOString();
    const entries = Object.values(entriesObject);
    setConversations(prev => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex];
      const msgs = [...(convo.messages || [])];
      msgs.push({
        role: 'assistant',
        kind: 'downloads',
        jobId,
        entries,
        content: `Downloads available (${entries.length})`,
        timestamp: nowIso
      });
      updated[currentConversationIndex] = { ...convo, messages: msgs };
      return updated;
    });
    bumpListToBottom();
  };

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
    rowHeightsRef.current = {};
    listRef.current?.resetAfterIndex(0, true);
  };

  const switchConversation = (index) => {
    setCurrentConversationIndex(index);
    rowHeightsRef.current = {};
    listRef.current?.resetAfterIndex(0, true);
  };

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  // ---------- Submits ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input };
    setConversations(prev => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex] ?? { id: Date.now(), title: 'New Analysis', messages: [] };
      const msgs = [...(convo.messages || [])];   // clone messages
      msgs.push(userMessage);                     // pure append
      updated[currentConversationIndex] = { ...convo, messages: msgs }; // replace convo
      return updated;
    });

    const currentInput = input;
    setInput('');
    setIsStreaming(true);

    try {
      const analysisRequest = parseAnalysisRequest(currentInput);
      if (!analysisRequest) {
        addAssistantMessage(
`I'm your **Stock Analysis Assistant**! 📊 

**How to get started:**
• Enter a stock ticker symbol (e.g., **AAPL**, **NVDA**, **TSLA**)
• For best results, use format: **TICKER, Company Name**
  - Example: **AAPL, Apple Inc.**
  - Example: **NVDA, NVIDIA Corporation**
  - Example: **TSLA, Tesla Inc.**

⚙️ **Configure Analysis Parameters:** use **Settings** ⚙️ above.

🎯 **Current Settings:** ${Object.keys(analysisParams).length > 0 ? `${Object.keys(analysisParams).length} parameters configured` : 'Using API defaults'}`
        );
        setIsStreaming(false);
        return;
      }

      addAssistantMessage(
`🚀 **Starting Analysis** for **${analysisRequest.ticker}**${analysisRequest.company ? ` (${analysisRequest.company})` : ''}

📋 **Request Parameters:**
\`\`\`json
${JSON.stringify(analysisRequest, null, 2)}
\`\`\`

⚡ **Connecting to analysis service...**`
      );

      const result = await api.startAnalysis(analysisRequest);
      setActiveJobId(result.job_id);
      localStorage.setItem('activeJob', JSON.stringify({ id: result.job_id, started: Date.now(), status: 'running' }));
      startJobMonitoring(result.job_id);

      if (conversations[currentConversationIndex].title === 'New Analysis') {
        const newTitle = generateTitle(currentInput);
        setConversations(prev => {
          const updated = [...prev];
          updated[currentConversationIndex].title = newTitle;
          return updated;
        });
      }
    } catch (error) {
      addAssistantMessage(`❌ **Analysis Failed:** ${error.message}`);
      setIsStreaming(false);
    }
  };

  // ---------- SSE monitoring ----------
  const startJobMonitoring = (jobId, opts = {}) => {
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch {}
      eventSourceRef.current = null;
    }

    const BATCH_LATENCY_MS = 200;
    const BATCH_COUNT_CAP = 200;
    const BATCH_BYTE_CAP  = 32_000;

    let batch = [];
    let batchBytes = 0;
    let flushTimer = null;

    const queue = (text, kind = 'log') => {
      if (kind !== 'log') { addAssistantMessage(text); return; }
      const s = typeof text === 'string' ? text : String(text);
      batch.push(s);
      batchBytes += s.length + 1;
      if (batch.length >= BATCH_COUNT_CAP || batchBytes >= BATCH_BYTE_CAP) { flush(); return; }
      if (!flushTimer) flushTimer = setTimeout(flush, BATCH_LATENCY_MS);
    };

    const flush = () => {
      if (!batch.length) { if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; } return; }
      const lines = batch; batch = []; batchBytes = 0;
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      addAssistantLogBatch(lines);
      const count = conversations[currentConversationIndex]?.messages?.length || 0;
      if (count > 0) listRef.current?.resetAfterIndex(count - 1);
    };

    const finalizeDone = (status = 'completed', note) => {
      flush();
      addAssistantMessage(`🏁 **Analysis Complete**${note ? `: ${note}` : ''} (status: ${status})`);
      setIsStreaming(false);
      setActiveJobId(null);
      setLastJobId(jobId);
      localStorage.removeItem('activeJob');
      (async () => {
        try {
          const detail = await api.getDetailedStatus(jobId);
          if (detail) {
            const files = detail.files_available || detail.files || {};
            const ticker = (detail.ticker || '').toUpperCase();
            const mapped = buildDownloadEntries(api.base, jobId, ticker, files);
            if (Object.keys(mapped).length > 0) {
              setAvailableFiles(mapped);
              setLastJobId(jobId);
              addDownloadsMessage(jobId, mapped);
            }
          }
        } catch {/* ignore */}
      })();
      if (eventSourceRef.current) { try { eventSourceRef.current.close(); } catch {} eventSourceRef.current = null; }
    };

    const finalizeFail = (status = 'failed', detail) => {
      flush();
      addAssistantMessage(`❌ **Analysis Failed** (status: ${status})${detail ? `\n\n${detail}` : ''}`);
      setIsStreaming(false);
      setActiveJobId(null);
      localStorage.removeItem('activeJob');
      if (eventSourceRef.current) { try { eventSourceRef.current.close(); } catch {} eventSourceRef.current = null; }
    };

    // open EventSource via API helper
    const es = api.openLogStream(jobId, {
      onOpen: () => {
        addAssistantMessage(opts.fromReconnect
          ? `🔄 **Reconnected to analysis job ${jobId}**`
          : `🔗 **Connected to analysis job ${jobId}**`);
      },
      onStatus: (payload) => {
        const { message, progress } = payload || {};
        queue(progress ? `**Status Update:** ${progress}` : `**Status:** ${message}`, 'status');
      },
      onLog: (payload) => {
        const { message } = payload || {};
        if (Array.isArray(message)) message.forEach(m => queue(m, 'log'));
        else if (message) {
          if (/ENTIRE PROGRAM.*COMPLETED/i.test(message)) {
            finalizeDone('completed', 'Analysis completed'); return;
          }
          queue(message, 'log');
        }
      },
      onLogBatch: (payload) => {
        const { message } = payload || {};
        if (Array.isArray(message)) message.forEach(m => queue(m, 'log'));
      },
      onCompleted: (payload) => {
        try {
          const { message, status } = payload || {};
          finalizeDone(status || 'completed', message);
        } catch {
          finalizeDone('completed');
        }
      },
      onServerError: (payload) => {
        const { message, detail, status } = payload || {};
        finalizeFail(status || 'failed', detail || message || 'Server signaled error');
      },
      onErrorEvent: () => {
        if (es.readyState === 2) { // CLOSED
          flush();
          addAssistantMessage('ℹ️ **Stream closed by server. Finalizing…**');
          setIsStreaming(false);
          setActiveJobId(null);
          setLastJobId(jobId);
          localStorage.removeItem('activeJob');
          try { es.close(); } catch {}
          eventSourceRef.current = null;
        } else {
          flush();
          addAssistantMessage('⚠️ **Connection issue:** Monitoring may resume automatically.');
        }
      }
    });

    eventSourceRef.current = es;
  };

  // ---------- Downloads ----------
  const saveBlob = async (blob, suggestedName) => {
    const supportsFS = 'showSaveFilePicker' in window;
    if (supportsFS) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Excel Workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    }
  };

  const handleDownload = async (entryOrKey) => {
    try {
      const entry = typeof entryOrKey === 'string' ? availableFiles[entryOrKey] : entryOrKey;
      if (!entry?.url) throw new Error('Unknown download type');
      const { blob, filename } = await downloadByEntry(entry);
      await saveBlob(blob, filename || entry.suggestedName || entry.label || 'download.xlsx');
      addAssistantMessage(`✅ **Downloaded:** ${filename}`);
    } catch (e) {
      addAssistantMessage(`❌ **Download Failed:** ${e.message}`);
    }
  };

  // ---------- Row renderer ----------
  const Row = ({ index, style, data }) => {
    const message = data[index];
    const isUser = message.role === 'user';
    const isLogBatch = message.kind === 'logbatch';
    const isDownloads = message.kind === 'downloads';
    const measureRef = useRef(null);

    useEffect(() => {
      if (!measureRef.current) return;
      const h = Math.ceil(measureRef.current.getBoundingClientRect().height) + 16;
      if (rowHeightsRef.current[index] !== h) {
        rowHeightsRef.current[index] = h;
        listRef.current?.resetAfterIndex(index);
      }
    }, [index, message]);

    return (
      <div style={style} className={`px-4 py-1 ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          ref={measureRef}
          className={`inline-block p-3 rounded-lg shadow-md max-w-[92%] break-words ${
            isUser ? 'bg-usermsg text-white' : 'bg-assistantmsg text-gray-800'
          }`}
        >
          {isDownloads ? (
            <div className="m-1 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <h3 className="text-base font-semibold text-blue-800 mb-2">📥 Available Downloads</h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(message.entries) && message.entries.map((entry) => (
                  <button
                    key={entry.key}
                    onClick={() => handleDownload(entry)}
                    className="text-xs inline-flex items-center px-3 py-2 rounded-md border border-blue-200 bg-white hover:bg-blue-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                    </svg>
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
          ) : isLogBatch ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-5">
              {message.lines ? message.lines.join('\n') : message.content}
            </pre>
          ) : (
            <ReactMarkdown
              className="prose max-w-none dark:prose-invert break-words overflow-x-auto"
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
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
                  );
                },
                pre({ node, children, ...props }) {
                  return (
                    <pre {...props} className="whitespace-pre-wrap break-words overflow-x-auto">
                      {children}
                    </pre>
                  );
                },
                p({ node, children, ...props }) {
                  return <p {...props} className="break-words">{children}</p>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}

          {isStreaming && index === data.length - 1 && !isUser && (
            <div className="mt-2 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm opacity-75">Analyzing...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getItemSize = (index) => rowHeightsRef.current[index] || DEFAULT_ROW_HEIGHT;

  // ---------- UI ----------
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1 overflow-auto">
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
            </div>
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className={`absolute top-4 ${isSidebarOpen ? 'left-64' : 'left-0'} transition-all duration-300`}>
              {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      <div className="flex flex-col flex-grow h-full">
        <div className="flex justify-between items-center p-4 bg-white border-b">
          <div className="text-lg font-semibold text-gray-700">
            Stock Analysis Assistant
            {activeJobId && <span className="ml-2 text-sm text-blue-600">• Job {activeJobId.slice(0, 8)} running...</span>}
          </div>
          <SettingsModal analysisParams={analysisParams} setAnalysisParams={setAnalysisParams} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto" ref={listContainerRef}>
            <List
              ref={listRef}
              height={listHeight}
              width={'100%'}
              itemCount={conversations[currentConversationIndex].messages.length}
              itemSize={getItemSize}
              itemData={conversations[currentConversationIndex].messages}
              overscanCount={6}
            >
              {Row}
            </List>
          </div>
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

// ChatPage.jsx (refined UI)
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from 'react-markdown';
import SettingsModal from '@/components/SettingsModal';
import { Loader2, PlusCircle, ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp, ArrowDown } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VariableSizeList as List } from 'react-window';
import { api, buildDownloadEntries, downloadByEntry } from '@/lib/api';
import { userStorage } from '@/lib/userStorage.js';

// NEW
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const ChatPage = () => {
  // ---------- Helper functions ----------
  const createWelcomeMessage = () => ({
    role: 'assistant',
    content: `**Welcome to Vynn AI. Your AI Financial Analyst!** 📊

**Getting Started:**
- Tell me which company or stock you’d like to analyze (e.g., "I want to analyze Google").
- Configure your analysis parameters using ⚙️ above.

Need financial statements, models, news, or insights? I’ve got you covered — just ask!`,
    timestamp: new Date().toISOString()
  });

  // ---------- Local state ----------
  const [analysisParams, setAnalysisParams] = useState(() => {
    return userStorage.getJSON('analysis_params', {});
  });
  const [conversations, setConversations] = useState(() => {
    const savedConversations = userStorage.getJSON('conversations');
    if (savedConversations) {
      return savedConversations;
    } else {
      // First time user - create conversation with welcome message
      return [{ id: Date.now(), title: 'New Analysis', messages: [createWelcomeMessage()] }];
    }
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
    const cached = userStorage.getJSON('activeJob');
    if (cached) {
      try {
        const { id, status } = cached;
        return status === 'running' ? id : null;
      } catch { return null; }
    }
    return null;
  });
  const eventSourceRef = useRef(null);
  const [availableFiles, setAvailableFiles] = useState({});
  const [lastJobId, setLastJobId] = useState(null);
  const downloadsPostedRef = useRef(new Set()); // jobIds we've already posted

    // NEW — rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Log panel collapse state - track collapsed state by message index
  const [collapsedLogs, setCollapsedLogs] = useState(new Set());

  // Scroll to bottom button state
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // REPLACE your filteredConversations with index mapping (so search works without breaking selection)
  const filteredConversations = conversations
    .map((c, idx) => ({ ...c, _index: idx }))
    .filter((c) => (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()));

  // NEW — select by id (safe when filtering)
  const switchConversationById = (id) => {
    const idx = conversations.findIndex((c) => c.id === id);
    if (idx !== -1) switchConversation(idx);
  };

  // NEW — rename helpers
  const startRename = (id, currentTitle) => {
    setRenamingId(id);
    setRenameValue(currentTitle || "");
  };

  const commitRename = () => {
    const val = (renameValue || "").trim();
    setConversations((prev) =>
      prev.map((c) => (c.id === renamingId ? { ...c, title: val || "Untitled chat" } : c))
    );
    setRenamingId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  // NEW — delete chat
  const deleteConversation = (id) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;

      // if deleting the active convo, stop streaming + close SSE
      if (idx === currentConversationIndex) {
        setIsStreaming(false);
        setActiveJobId(null);
        userStorage.removeItem("activeJob");
        if (eventSourceRef.current) {
          try { eventSourceRef.current.close(); } catch {}
          eventSourceRef.current = null;
        }
      }

      const next = prev.filter((c) => c.id !== id);
      // choose a sane next index
      let nextIndex = currentConversationIndex;
      if (idx < currentConversationIndex) nextIndex = Math.max(0, currentConversationIndex - 1);
      if (idx === currentConversationIndex) nextIndex = Math.max(0, idx - 1);

      // fallback: always keep at least one chat
      const finalList = next.length ? next : [{ id: Date.now(), title: "New Analysis", messages: [createWelcomeMessage()] }];
      setCurrentConversationIndex(Math.min(nextIndex, finalList.length - 1));
      return finalList;
    });
    // if we were renaming this one, reset rename state
    if (renamingId === id) cancelRename();
  };

  const confirmDelete = (id) => {
    if (window.confirm("Delete this chat? This cannot be undone.")) {
      deleteConversation(id);
    }
  };


  // ---------- Persistence ----------
  useEffect(() => {
    if (userStorage.hasUser()) {
      userStorage.setJSON('conversations', conversations);
      userStorage.setJSON('analysis_params', analysisParams);
    }
  }, [conversations, analysisParams]);

  // ---------- Handle user changes ----------
  useEffect(() => {
    const currentUser = userStorage.getCurrentUser();
    const storedUser = localStorage.getItem('lastActiveUser');
    
    if (currentUser && currentUser !== storedUser) {
      // User has changed - reset state to new user's data
      localStorage.setItem('lastActiveUser', currentUser);
      
      // Load new user's data
      const newConversations = userStorage.getJSON('conversations');
      const newAnalysisParams = userStorage.getJSON('analysis_params', {});
      const newActiveJob = userStorage.getJSON('activeJob');
      
      if (newConversations) {
        setConversations(newConversations);
      } else {
        // First time user - create conversation with welcome message
        setConversations([{ id: Date.now(), title: 'New Analysis', messages: [createWelcomeMessage()] }]);
      }
      
      setAnalysisParams(newAnalysisParams);
      setCurrentConversationIndex(0);
      
      // Handle active job
      if (newActiveJob && newActiveJob.status === 'running') {
        setActiveJobId(newActiveJob.id);
      } else {
        setActiveJobId(null);
      }
      
      // Reset other state
      setCollapsedLogs(new Set());
      rowHeightsRef.current = {};
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, true);
      }
    } else if (!currentUser && storedUser) {
      // User logged out - clear the stored user
      localStorage.removeItem('lastActiveUser');
    }
  }, []);

  // ---------- Listen for auth changes ----------
  useEffect(() => {
    const handleAuthChange = () => {
      const currentUser = userStorage.getCurrentUser();
      const storedUser = localStorage.getItem('lastActiveUser');
      
      if (!currentUser) {
        // User logged out
        localStorage.removeItem('lastActiveUser');
      } else if (currentUser !== storedUser) {
        // User changed - force page reload to reset all state properly
        window.location.reload();
      }
    };

    window.addEventListener('authUpdated', handleAuthChange);
    return () => window.removeEventListener('authUpdated', handleAuthChange);
  }, []);

  // ---------- Reconnect SSE if needed ----------
  useEffect(() => {
    let reconnectInterval = null;

    const checkAndReconnect = async () => {
      const cached = userStorage.getJSON('activeJob');
      if (!cached) return;
      if (!cached.id || cached.status !== 'running') return;
      if (eventSourceRef.current) return;

      try {
        const status = await api.getJobStatus(cached.id);
        if (!status) {
          userStorage.removeItem('activeJob');
          setActiveJobId(null);
          setIsStreaming(false);
          return;
        }
        if (status.status === 'running' || status.status === 'pending') {
          setActiveJobId(cached.id);
          setIsStreaming(true);
          startJobMonitoring(cached.id, { fromReconnect: true });
        } else {
          userStorage.removeItem('activeJob');
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
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [currentConversationIndex, conversations]);

  // ---------- Scroll detection ----------
  useEffect(() => {
    if (!listRef.current?._outerRef) return;
    
    const scrollContainer = listRef.current._outerRef;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 50; // Reduced threshold
      
      // Debug logging
      console.log('Scroll Debug:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        distanceFromBottom,
        isNearBottom,
        shouldShowButton: !isNearBottom
      });
      
      setShowScrollToBottom(!isNearBottom);
      
      if (isNearBottom) {
        setUnreadMessages(0);
      }
    };

    // Initial check
    handleScroll();
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [conversations, currentConversationIndex]);

  // ---------- Track unread messages when new messages arrive ----------
  const lastMessageCountRef = useRef(0);
  
  // Initialize message count tracking
  useEffect(() => {
    const msgs = conversations[currentConversationIndex]?.messages ?? [];
    lastMessageCountRef.current = msgs.length;
  }, []); // Only run on mount
  
  useEffect(() => {
    const msgs = conversations[currentConversationIndex]?.messages ?? [];
    const currentMessageCount = msgs.length;
    
    // Only increment unread count if:
    // 1. Message count actually increased (new message arrived)
    // 2. User is not at bottom (showScrollToBottom is true)
    // 3. This is not the initial load or conversation switch
    if (currentMessageCount > lastMessageCountRef.current && showScrollToBottom) {
      const newMessagesCount = currentMessageCount - lastMessageCountRef.current;
      setUnreadMessages(prev => prev + newMessagesCount);
      console.log(`New messages detected: ${newMessagesCount}, Total unread: ${unreadMessages + newMessagesCount}`);
    }
    
    // Update the ref to current count
    lastMessageCountRef.current = currentMessageCount;
  }, [conversations[currentConversationIndex]?.messages?.length, showScrollToBottom]);

  // ---------- Helpers ----------
  const parseAnalysisRequest = (textIn) => {
    const email = localStorage.getItem('auth_email');
    const req = { request: textIn, email };
    Object.keys(analysisParams).forEach(k => {
      const v = analysisParams[k];
      if (v !== undefined && v !== null && v !== '') req[k] = v;
    });
    return req;
  };

  // Manual scroll to bottom function for user interaction
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const count = conversations[currentConversationIndex]?.messages?.length || 0;
      if (count > 0 && listRef.current) {
        listRef.current.resetAfterIndex(count - 1, true);
        listRef.current.scrollToItem(count - 1, 'end');
        setShowScrollToBottom(false);
        setUnreadMessages(0);
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
    const newConversation = { 
      id: Date.now(), 
      title: 'New Analysis', 
      messages: [createWelcomeMessage()] 
    };
    setConversations([...conversations, newConversation]);
    setCurrentConversationIndex(conversations.length);
    rowHeightsRef.current = {};
    setShowScrollToBottom(false);
    setUnreadMessages(0);
    
    // Reset message count tracking for new conversation
    lastMessageCountRef.current = 1; // One welcome message
    
    // Scroll to bottom for new conversation
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, true);
        listRef.current.scrollToItem(0, 'end');
      }
    });
  };

  const switchConversation = (index) => {
    setCurrentConversationIndex(index);
    rowHeightsRef.current = {};
    setShowScrollToBottom(false);
    setUnreadMessages(0);
    
    // Reset message count tracking for new conversation
    const msgs = conversations[index]?.messages ?? [];
    lastMessageCountRef.current = msgs.length;
    
    // Scroll to bottom after switching conversation
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, true);
        const msgs = conversations[index]?.messages ?? [];
        if (msgs.length > 0) {
          listRef.current.scrollToItem(msgs.length - 1, 'end');
        }
      }
    });
  };

  // Toggle log panel collapse state
  const toggleLogCollapse = (messageIndex) => {
    setCollapsedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
    
    // Force immediate re-measurement and virtual list reset
    setTimeout(() => {
      // Clear the height cache for this specific row
      delete rowHeightsRef.current[messageIndex];
      
      // Reset the virtual list starting from this index
      if (listRef.current) {
        listRef.current.resetAfterIndex(messageIndex, true);
        
        // Force a re-render by scrolling slightly and back
        const currentScroll = listRef.current._outerRef?.scrollTop || 0;
        requestAnimationFrame(() => {
          if (listRef.current?._outerRef) {
            listRef.current._outerRef.scrollTop = currentScroll + 1;
            requestAnimationFrame(() => {
              if (listRef.current?._outerRef) {
                listRef.current._outerRef.scrollTop = currentScroll;
              }
            });
          }
        });
      }
    }, 0);
  };

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

    // Auto-scroll to bottom when user sends a message
    setTimeout(() => scrollToBottom(), 100);

    const currentInput = input;
    setInput('');
    setIsStreaming(true);

    try {      
      const analysisRequest = parseAnalysisRequest(currentInput);

      addAssistantMessage(
`🚀 **I will help you** with **${analysisRequest.request}**

📋 **Request Parameters:**
\`\`\`json
${JSON.stringify(analysisRequest, null, 2)}
\`\`\`

⚡ **Connecting to analysis service...**`
      );

      const result = await api.startAnalysis(analysisRequest);
      setActiveJobId(result.job_id);
      userStorage.setJSON('activeJob', { id: result.job_id, started: Date.now(), status: 'running' });
      startJobMonitoring(result.job_id);

      if (conversations[currentConversationIndex].title === 'New Analysis') {
        const newTitle = `${result.ticker} Stock Analysis`;
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
      addAssistantMessage(`🏁 **Analysis Complete**${note ? `: ${note}` : ''}.`);
      setIsStreaming(false);
      setActiveJobId(null);
      setLastJobId(jobId);
      userStorage.removeItem('activeJob');
      (async () => {
        try {
          const detail = await api.getDetailedStatus(jobId);
          if (detail) {
            const files = detail.files_available || detail.files || {};
            console.log(files)
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
      userStorage.removeItem('activeJob');
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
          userStorage.removeItem('activeJob');
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

  // ---------- Row renderer (UI refresh) ----------
  const Row = ({ index, style, data }) => {
    const message = data[index];
    const isUser = message.role === 'user';
    const isLogBatch = message.kind === 'logbatch';
    const isDownloads = message.kind === 'downloads';
    const measureRef = useRef(null);

    useEffect(() => {
      if (!measureRef.current) return;
      
      const measureHeight = () => {
        const rect = measureRef.current.getBoundingClientRect();
        const h = Math.ceil(rect.height) + 16;
        
        if (rowHeightsRef.current[index] !== h && h > 0) {
          rowHeightsRef.current[index] = h;
          // Use requestAnimationFrame for smooth updates
          requestAnimationFrame(() => {
            listRef.current?.resetAfterIndex(index);
          });
        }
      };
      
      // Measure immediately
      measureHeight();
      
      // Also measure after a small delay to catch any async rendering
      const timer = setTimeout(measureHeight, 50);
      
      return () => clearTimeout(timer);
    }, [index, message, collapsedLogs.has(index)]);

    const Bubble = ({ children }) => (
      <div
        ref={measureRef}
        className={[
          "inline-block max-w-[920px] break-words",
          "rounded-2xl shadow-sm ring-1",
          isUser
            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-blue-700/30"
            : "bg-white text-slate-800 ring-slate-200"
        ].join(" ")}
      >
        <div className={isUser ? "p-3 sm:p-4" : "p-4 sm:p-5"}>{children}</div>
      </div>
    );

    return (
      <div style={style} className="px-4 py-2">
        <div className={isUser ? "flex justify-end" : "flex justify-start"}>
          {isDownloads ? (
            <Bubble>
              <div className="m-0">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Available Downloads
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.isArray(message.entries) && message.entries.map((entry) => (
                    <button
                      key={entry.key}
                      onClick={() => handleDownload(entry)}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                        </svg>
                        {entry.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </Bubble>
          ) : isLogBatch ? (
            <div
              ref={measureRef}
              className="inline-block max-w-[1000px] rounded-2xl overflow-hidden bg-white ring-1 ring-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] tracking-wide font-semibold text-slate-700 uppercase">Live Analysis Log</span>
                </div>
                <button
                  onClick={() => toggleLogCollapse(index)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  aria-label={collapsedLogs.has(index) ? "Expand log" : "Collapse log"}
                >
                  <span className="text-[10px] font-medium text-slate-600">
                    {collapsedLogs.has(index) ? 'Show' : 'Hide'}
                  </span>
                  {collapsedLogs.has(index) ? (
                    <ChevronDown className="h-3 w-3 text-slate-500" />
                  ) : (
                    <ChevronUp className="h-3 w-3 text-slate-500" />
                  )}
                </button>
              </div>
              {!collapsedLogs.has(index) && (
                <>
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12.75px] leading-5 text-slate-700 p-4 bg-slate-50/50">
                    {message.lines ? message.lines.join('\n') : message.content}
                  </pre>
                  {isStreaming && index === data.length - 1 && (
                    <div className="border-t border-slate-200 px-4 py-2 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Analyzing…</span>
                    </div>
                  )}
                </>
              )}
              {collapsedLogs.has(index) && (
                <div className="px-4 py-3 bg-slate-50/50">
                  <span className="text-xs text-slate-500 italic">
                    Log collapsed ({message.lines ? message.lines.length : '1'} lines)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <Bubble>
              <ReactMarkdown
                className={`prose max-w-none break-words overflow-x-auto prose-p:my-3 prose-headings:mt-0 prose-headings:mb-2
                      ${isUser ? 'prose-invert' : 'prose-slate'}`}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="overflow-x-auto rounded-md ring-1 ring-slate-200">
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
                      <code
                        {...props}
                        className={`${className} break-all px-1.5 py-0.5 rounded ${
                          isUser ? 'bg-white/20 text-white' : 'bg-slate-100'
                        }`}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ node, children, ...props }) {
                    return (
                      <pre {...props} className="whitespace-pre-wrap break-words overflow-x-auto rounded-md ring-1 ring-slate-200 bg-slate-50 p-3">
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
            </Bubble>
          )}
        </div>
      </div>
    );
  };

  const getItemSize = (index) => rowHeightsRef.current[index] || DEFAULT_ROW_HEIGHT;

  // ---------- UI ----------
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100 overflow-x-hidden">
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
            <div className="flex-1 overflow-auto space-y-1">
              {filteredConversations.map((c) => {
                const idx = c._index;
                const isActive = currentConversationIndex === idx;
                const isEditing = renamingId === c.id;

                return (
                  <div key={c.id} className="group relative">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => { e.preventDefault(); commitRename(); }}
                        className="flex items-center gap-2 mb-1"
                      >
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => { if (e.key === "Escape") cancelRename(); }}
                          className="h-9"
                        />
                        <Button type="submit" size="sm">Save</Button>
                      </form>
                    ) : (
                      <>
                        <Button
                          onClick={() => switchConversationById(c.id)}
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start pr-9 truncate"
                        >
                          <span className="truncate">{c.title}</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100"
                              aria-label="Chat actions"
                            >
                              <MoreVertical className="h-4 w-4 text-slate-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" side="right" className="w-44">
                            <DropdownMenuItem onClick={() => startRename(c.id, c.title)} className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => confirmDelete(c.id)}
                              className="flex items-center gap-2 text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                );
              })}
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
        <div className="flex justify-between items-center p-4 bg-white/90 backdrop-blur border-b">
          <div className="text-lg font-semibold text-gray-700 flex items-center gap-3">
            AI Stock Analyst
            {activeJobId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Job {activeJobId.slice(0, 8)} running
              </span>
            )}
          </div>
          <SettingsModal analysisParams={analysisParams} setAnalysisParams={setAnalysisParams} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto relative" ref={listContainerRef}>
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
            
            {/* Scroll to Bottom Button */}
            {showScrollToBottom && (
              <div className="absolute bottom-4 right-4 z-50 opacity-100 transform transition-all duration-300 ease-in-out">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={scrollToBottom}
                      variant="default"
                      size="default"
                      className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-2 border-white transition-all duration-200 hover:scale-105 relative group"
                    >
                      <ArrowDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{unreadMessages > 0 ? `${unreadMessages} new message${unreadMessages > 1 ? 's' : ''}` : 'Scroll to bottom'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            
            {/* Debug info - only show when there are unread messages */}
            {unreadMessages > 0 && (
              <div className="absolute top-4 right-4 z-50 bg-black text-white p-2 rounded text-xs">
                Unread: {unreadMessages}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t shadow-sm">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to analyze any stock or company."
              className="flex-grow rounded-xl"
              disabled={isStreaming}
            />
            <Button type="submit" disabled={isStreaming} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

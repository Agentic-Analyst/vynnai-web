// ChatPage.jsx (refined UI)
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import SettingsModal from '@/components/SettingsModal';
import { Loader2, PlusCircle, ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp, ArrowDown, StopCircle } from "lucide-react";
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
  const [isStoppingJob, setIsStoppingJob] = useState(false);

    // NEW — rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Log panel collapse state - track collapsed state by message index
  const [collapsedLogs, setCollapsedLogs] = useState(new Set());

  // Scroll to bottom button state
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  
  // Deterministic explanation report state
  const [capturedReport, setCapturedReport] = useState(null);
  const reportCaptureRef = useRef({ 
    isCapturing: false, 
    content: '', 
    reportType: '',
    reports: { deterministic: '', llm: '' } // Store both reports
  });

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
    let isUserScrolling = false;
    let scrollTimeout = null;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 50; // Reduced threshold
      
      // Detect if user manually scrolled up (and disable auto-scroll)
      if (!isUserScrolling && autoScrollEnabled && !isNearBottom && isUserAtBottom) {
        // User was at bottom and scrolled up manually
        setAutoScrollEnabled(false);
      }
      
      // Track if user is at bottom
      setIsUserAtBottom(isNearBottom);
      
      // Enable auto-scroll when user reaches bottom
      if (isNearBottom && !autoScrollEnabled) {
        setAutoScrollEnabled(true);
      }
      
      setShowScrollToBottom(!isNearBottom);
      
      if (isNearBottom) {
        setUnreadMessages(0);
      }
      
      // Mark that user is actively scrolling
      isUserScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, 150); // Give a small delay to detect end of scroll
    };

    // Initial check
    handleScroll();
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [conversations, currentConversationIndex, autoScrollEnabled, isUserAtBottom]);

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
    
    // Only process if message count actually increased (new message arrived)
    if (currentMessageCount > lastMessageCountRef.current) {
      const newMessagesCount = currentMessageCount - lastMessageCountRef.current;
      
      // If user is at bottom and auto-scroll is enabled, automatically scroll
      if (isUserAtBottom && autoScrollEnabled) {
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.resetAfterIndex(currentMessageCount - 1, true);
            listRef.current.scrollToItem(currentMessageCount - 1, 'end');
          }
        });
      } 
      // If user is not at bottom, increment unread count
      else if (!isUserAtBottom) {
        setUnreadMessages(prev => prev + newMessagesCount);
        console.log(`New messages detected: ${newMessagesCount}, Total unread: ${unreadMessages + newMessagesCount}`);
      }
    }
    
    // Update the ref to current count
    lastMessageCountRef.current = currentMessageCount;
  }, [conversations[currentConversationIndex]?.messages?.length, isUserAtBottom, autoScrollEnabled]);

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
        setAutoScrollEnabled(true); // Re-enable auto-scroll when user manually goes to bottom
        console.log('Manual scroll to bottom - auto-scroll re-enabled');
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

  const addReportMessage = (reportContent, reportType = 'deterministic') => {
    const nowIso = new Date().toISOString();
    setConversations(prev => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex];
      const msgs = [...(convo.messages || [])];
      msgs.push({
        role: 'assistant',
        kind: 'report',
        reportType: reportType,
        content: reportContent,
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
    setIsUserAtBottom(true);
    setAutoScrollEnabled(true);
    
    // Reset report capture state
    reportCaptureRef.current = { 
      isCapturing: false, 
      content: '', 
      reportType: '',
      reports: { deterministic: '', llm: '' }
    };
    setCapturedReport(null);
    
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
    setIsUserAtBottom(true);
    setAutoScrollEnabled(true);
    
    // Reset report capture state
    reportCaptureRef.current = { 
      isCapturing: false, 
      content: '', 
      reportType: '',
      reports: { deterministic: '', llm: '' }
    };
    setCapturedReport(null);
    
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

  // ---------- Job Control ----------
  const handleStopJob = async () => {
    if (!activeJobId || isStoppingJob) return;
    
    setIsStoppingJob(true);
    try {
      const result = await api.stopJob(activeJobId);
      
      // Add a system message about stopping
      addAssistantMessage(`🛑 **Job stopped by user**\n\nJob ${activeJobId.slice(0, 8)} has been stopped. The analysis was interrupted and may be incomplete.`);
      
      // Clear active job state
      setActiveJobId(null);
      userStorage.remove('activeJob');
      
      // Close event source if open
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      console.log('Job stopped successfully:', result);
    } catch (error) {
      console.error('Failed to stop job:', error);
    } finally {
      setIsStoppingJob(false);
    }
  };

  // ---------- Submits ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If there's an active job, stop it instead of starting a new one
    if (activeJobId) {
      await handleStopJob();
      return;
    }
    
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
      
      // Check for deterministic explanation report start
      if (s.includes('📄 Financial analysis summary generated successfully:')) {
        console.log('🔍 Detected deterministic report marker, starting capture...');
        reportCaptureRef.current.isCapturing = true;
        reportCaptureRef.current.content = '';
        reportCaptureRef.current.reportType = 'deterministic';
        
        // Extract content after the marker if it's on the same line
        const markerIndex = s.indexOf('📄 Financial analysis summary generated successfully:');
        const afterMarker = s.substring(markerIndex + '📄 Financial analysis summary generated successfully:'.length).trim();
        if (afterMarker) {
          reportCaptureRef.current.content = afterMarker;
          console.log('📝 Initial financial analysis summary content captured:', afterMarker.substring(0, 100) + '...');
        }
      }
      // Check for LLM explanation report start
      else if (s.includes('📄 Professional analyst report generated successfully:')) {
        console.log('🔍 Detected LLM report marker, starting capture...');
        reportCaptureRef.current.isCapturing = true;
        reportCaptureRef.current.content = '';
        reportCaptureRef.current.reportType = 'llm';
        
        // Extract content after the marker if it's on the same line
        const markerIndex = s.indexOf('📄 Professional analyst report generated successfully:');
        const afterMarker = s.substring(markerIndex + '📄 Professional analyst report generated successfully:'.length).trim();
        if (afterMarker) {
          reportCaptureRef.current.content = afterMarker;
          console.log('📝 Professional analyst report content captured:', afterMarker.substring(0, 100) + '...');
        }
      }
      // If we're capturing, add to the report content
      else if (reportCaptureRef.current.isCapturing) {
        // Stop capturing when we hit certain patterns that indicate end of report
        if (s.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| (INFO|DEBUG|WARNING|ERROR)/)) {
          // This looks like a new log entry, finalize current report and stop capturing
          console.log('🛑 Stopping report capture (detected new log entry)');
          
          // Store the completed report
          if (reportCaptureRef.current.reportType && reportCaptureRef.current.content.trim()) {
            reportCaptureRef.current.reports[reportCaptureRef.current.reportType] = reportCaptureRef.current.content.trim();
            console.log('💾 Stored', reportCaptureRef.current.reportType, 'report, length:', reportCaptureRef.current.content.trim().length);
          }
          
          reportCaptureRef.current.isCapturing = false;
          reportCaptureRef.current.content = '';
          reportCaptureRef.current.reportType = '';
        } else {
          // Continue capturing
          if (reportCaptureRef.current.content) {
            reportCaptureRef.current.content += '\n' + s;
          } else {
            reportCaptureRef.current.content = s;
          }
          console.log('📝 Added to', reportCaptureRef.current.reportType, 'report content:', s.substring(0, 50) + '...');
        }
      }
      
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
      
      // Finalize any currently capturing report
      if (reportCaptureRef.current.isCapturing && reportCaptureRef.current.reportType && reportCaptureRef.current.content.trim()) {
        reportCaptureRef.current.reports[reportCaptureRef.current.reportType] = reportCaptureRef.current.content.trim();
        console.log('� Finalized', reportCaptureRef.current.reportType, 'report during completion');
        reportCaptureRef.current.isCapturing = false;
        reportCaptureRef.current.content = '';
        reportCaptureRef.current.reportType = '';
      }
      
      // Display both captured reports if available
      if (reportCaptureRef.current.reports.deterministic) {
        console.log('📊 Displaying deterministic report with length:', reportCaptureRef.current.reports.deterministic.length);
        addReportMessage(reportCaptureRef.current.reports.deterministic, 'deterministic');
      }
      
      if (reportCaptureRef.current.reports.llm) {
        console.log('🤖 Displaying LLM report with length:', reportCaptureRef.current.reports.llm.length);
        addReportMessage(reportCaptureRef.current.reports.llm, 'llm');
      }
      
      if (!reportCaptureRef.current.reports.deterministic && !reportCaptureRef.current.reports.llm) {
        console.log('⚠️ No reports captured');
      }
      
      // Reset report capture state
      reportCaptureRef.current.reports = { deterministic: '', llm: '' };
      
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
        if (typeof e.message === "string" && e.message.includes("The user aborted a request")) {
          return;
        }
      console.error('Download error:', e);
      addAssistantMessage(`❌ **Download Failed:** ${e.message}`);
    }
  };

  // ---------- Row renderer (UI refresh) ----------
  const Row = ({ index, style, data }) => {
    const message = data[index];
    const isUser = message.role === 'user';
    const isLogBatch = message.kind === 'logbatch';
    const isDownloads = message.kind === 'downloads';
    const isReport = message.kind === 'report';
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
          ) : isReport ? (
            <div
              ref={measureRef}
              className={`inline-block max-w-[1000px] rounded-2xl overflow-hidden shadow-lg ring-1 ${
                message.reportType === 'llm' 
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 ring-purple-200'
                  : 'bg-gradient-to-br from-indigo-50 to-blue-50 ring-indigo-200'
              }`}
            >
              <div className={`flex items-center gap-3 px-5 py-3 border-b ${
                message.reportType === 'llm'
                  ? 'border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100'
                  : 'border-indigo-200 bg-gradient-to-r from-indigo-100 to-blue-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full shadow-sm ${
                    message.reportType === 'llm' ? 'bg-purple-500' : 'bg-indigo-500'
                  }`} />
                  <span className={`text-sm font-bold tracking-wide ${
                    message.reportType === 'llm' ? 'text-purple-900' : 'text-indigo-900'
                  }`}>
                    {message.reportType === 'llm' ? '📑 LLM ANALYSIS REPORT' : '📊 DETERMINISTIC ANALYSIS REPORT'}
                  </span>
                </div>
                <span className={`ml-auto text-xs font-medium bg-white/60 px-2 py-1 rounded-full ${
                  message.reportType === 'llm' ? 'text-purple-600' : 'text-indigo-600'
                }`}>
                  {message.reportType === 'llm' ? 'AI-Generated Output' : 'Deterministic Model Output'}
                </span>
              </div>
              <div className="p-5 bg-white/80">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  className={`prose prose-sm max-w-none break-words prose-headings:font-bold prose-p:leading-relaxed prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 ${
                    message.reportType === 'llm'
                      ? 'prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-purple-700 prose-code:bg-purple-50 prose-code:text-purple-800'
                      : 'prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-indigo-700 prose-code:bg-indigo-50 prose-code:text-indigo-800'
                  }`}
                  components={{
                    h1: ({ children }) => (
                      <h1 className={`text-xl font-bold mb-3 pb-2 border-b ${
                        message.reportType === 'llm' 
                          ? 'text-purple-900 border-purple-200' 
                          : 'text-indigo-900 border-indigo-200'
                      }`}>{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className={`text-lg font-semibold mb-2 mt-4 ${
                        message.reportType === 'llm' ? 'text-purple-800' : 'text-indigo-800'
                      }`}>{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-medium text-slate-700 mb-2 mt-3">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-slate-600 leading-relaxed mb-3">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 text-slate-600 mb-3">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 mb-3">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-slate-600">{children}</li>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-slate-300">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-slate-100">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody>{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="border-b border-slate-200">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-slate-300 px-3 py-2 text-slate-600">{children}</td>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-3">{children}</blockquote>
                    ),
                    br: () => <br className="my-1" />,
                    code: ({ node, inline, children, ...props }) => 
                      inline ? (
                        <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                          message.reportType === 'llm' 
                            ? 'bg-purple-50 text-purple-800' 
                            : 'bg-indigo-50 text-indigo-800'
                        }`} {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm font-mono text-slate-700 overflow-x-auto" {...props}>
                          <code>{children}</code>
                        </pre>
                      )
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              <div className={`px-5 py-3 border-t ${
                message.reportType === 'llm'
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                  : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
              }`}>
                <div className={`flex items-center justify-between text-xs ${
                  message.reportType === 'llm' ? 'text-purple-600' : 'text-indigo-600'
                }`}>
                  <span className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      message.reportType === 'llm' ? 'bg-purple-400' : 'bg-indigo-400'
                    }`} />
                    Generated by Vynn AI Agent
                  </span>
                  <span>
                    {new Date(message.timestamp || Date.now()).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Bubble>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
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
                  ul({ node, children, ...props }) {
                    return <ul {...props} className="list-disc list-inside space-y-1 mb-3">{children}</ul>;
                  },
                  ol({ node, children, ...props }) {
                    return <ol {...props} className="list-decimal list-inside space-y-1 mb-3">{children}</ol>;
                  },
                  li({ node, children, ...props }) {
                    return <li {...props} className="break-words">{children}</li>;
                  },
                  table({ node, children, ...props }) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table {...props} className="min-w-full border-collapse border border-slate-300">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ node, children, ...props }) {
                    return <thead {...props} className={`${isUser ? 'bg-white/20' : 'bg-slate-100'}`}>{children}</thead>;
                  },
                  tbody({ node, children, ...props }) {
                    return <tbody {...props}>{children}</tbody>;
                  },
                  tr({ node, children, ...props }) {
                    return <tr {...props} className={`border-b ${isUser ? 'border-white/20' : 'border-slate-200'}`}>{children}</tr>;
                  },
                  th({ node, children, ...props }) {
                    return <th {...props} className={`border px-3 py-2 text-left font-semibold ${isUser ? 'border-white/20 text-white' : 'border-slate-300 text-slate-700'}`}>{children}</th>;
                  },
                  td({ node, children, ...props }) {
                    return <td {...props} className={`border px-3 py-2 ${isUser ? 'border-white/20 text-white' : 'border-slate-300 text-slate-600'}`}>{children}</td>;
                  },
                  blockquote({ node, children, ...props }) {
                    return <blockquote {...props} className={`border-l-4 pl-4 italic my-3 ${isUser ? 'border-white/40 text-white/90' : 'border-slate-300 text-slate-600'}`}>{children}</blockquote>;
                  },
                  br() {
                    return <br className="my-1" />;
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
              disabled={activeJobId || isStreaming}
            />
            <Button 
              type="submit" 
              disabled={isStoppingJob || (!activeJobId && (!input.trim() || isStreaming))}
              className={`rounded-xl ${
                activeJobId 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              }`}
            >
              {activeJobId ? (
                isStoppingJob ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop Analysis
                  </>
                )
              ) : (
                'Analyze'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

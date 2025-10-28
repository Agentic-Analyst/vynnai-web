// ChatPage.jsx (refined UI)
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  Loader2,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  StopCircle,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { VariableSizeList as List } from "react-window";
import { api, buildDownloadEntries, downloadByEntry } from "@/lib/api";
import { userStorage } from "@/lib/userStorage.js";

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
    role: "assistant",
    content: `**Welcome to VYNN AI. Your AI Financial Analyst!** 📊

**Getting Started:**
- Tell me which company or stock you’d like to analyze (e.g., "I want to analyze Google").
- Configure your analysis parameters using ⚙️ above.

Need financial statements, models, news, or insights? I’ve got you covered — just ask!`,
    timestamp: new Date().toISOString(),
  });

  // ---------- Local state ----------
  const [analysisParams, setAnalysisParams] = useState(() => {
    return userStorage.getJSON("analysis_params", {});
  });
  const [conversations, setConversations] = useState(() => {
    const savedConversations = userStorage.getJSON("conversations");
    if (savedConversations) {
      // Migrate existing conversations to include job state fields if missing
      return savedConversations.map((conv) => ({
        ...conv,
        activeJobId: conv.activeJobId || null,
        isStreaming: conv.isStreaming || false,
        jobProgress: conv.jobProgress || null,
      }));
    } else {
      // First time user - create conversation with welcome message
      return [
        {
          id: Date.now(),
          title: "New Analysis",
          messages: [createWelcomeMessage()],
          activeJobId: null,
          isStreaming: false,
          jobProgress: null,
        },
      ];
    }
  });
  const [currentConversationIndex, setCurrentConversationIndex] = useState(0);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // virtualization
  const listRef = useRef(null);
  const listContainerRef = useRef(null);
  const [listHeight, setListHeight] = useState(400);
  const rowHeightsRef = useRef({});
  const DEFAULT_ROW_HEIGHT = 56;

  // job state
  const eventSourceRef = useRef(null);
  const progressPollRef = useRef(null);
  const [availableFiles, setAvailableFiles] = useState({});
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
  const reportCaptureRef = useRef({
    isCapturing: false,
    content: "",
    reportType: "",
    reports: { deterministic: "", llm: "" }, // Store both reports
  });

  // REPLACE your filteredConversations with index mapping (so search works without breaking selection)
  const filteredConversations = conversations
    .map((c, idx) => ({ ...c, _index: idx }))
    .filter((c) =>
      (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

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
      prev.map((c) =>
        c.id === renamingId ? { ...c, title: val || "Untitled chat" } : c
      )
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

      // if deleting the active convo, check if it has a running job and clean up
      if (idx === currentConversationIndex) {
        const conversation = prev[idx];
        if (conversation?.activeJobId) {
          // Clean up job state for this conversation
          userStorage.removeItem("activeJob");
          if (eventSourceRef.current) {
            try {
              eventSourceRef.current.close();
            } catch {}
            eventSourceRef.current = null;
          }
          if (progressPollRef.current) {
            clearInterval(progressPollRef.current);
            progressPollRef.current = null;
          }
        }
      }

      const next = prev.filter((c) => c.id !== id);
      // choose a sane next index
      let nextIndex = currentConversationIndex;
      if (idx < currentConversationIndex)
        nextIndex = Math.max(0, currentConversationIndex - 1);
      if (idx === currentConversationIndex) nextIndex = Math.max(0, idx - 1);

      // fallback: always keep at least one chat
      const finalList = next.length
        ? next
        : [
            {
              id: Date.now(),
              title: "New Analysis",
              messages: [createWelcomeMessage()],
              activeJobId: null,
              isStreaming: false,
              jobProgress: null,
            },
          ];
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
      userStorage.setJSON("conversations", conversations);
      userStorage.setJSON("analysis_params", analysisParams);
    }
  }, [conversations, analysisParams]);

  // ---------- Handle user changes ----------
  useEffect(() => {
    const currentUser = userStorage.getCurrentUser();
    const storedUser = localStorage.getItem("lastActiveUser");

    if (currentUser && currentUser !== storedUser) {
      // User has changed - reset state to new user's data
      localStorage.setItem("lastActiveUser", currentUser);

      // Load new user's data
      const newConversations = userStorage.getJSON("conversations");
      const newAnalysisParams = userStorage.getJSON("analysis_params", {});
      const newActiveJob = userStorage.getJSON("activeJob");

      if (newConversations) {
        setConversations(newConversations);
      } else {
        // First time user - create conversation with welcome message
        setConversations([
          {
            id: Date.now(),
            title: "New Analysis",
            messages: [createWelcomeMessage()],
            activeJobId: null,
            isStreaming: false,
            jobProgress: null,
          },
        ]);
      }

      setAnalysisParams(newAnalysisParams);
      setCurrentConversationIndex(0);

      // Active job handling is now per-conversation, no global state needed

      // Reset other state
      setCollapsedLogs(new Set());
      rowHeightsRef.current = {};
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, true);
      }
    } else if (!currentUser && storedUser) {
      // User logged out - clear the stored user
      localStorage.removeItem("lastActiveUser");
    }
  }, []);

  // ---------- Listen for auth changes ----------
  useEffect(() => {
    const handleAuthChange = () => {
      const currentUser = userStorage.getCurrentUser();
      const storedUser = localStorage.getItem("lastActiveUser");

      if (!currentUser) {
        // User logged out
        localStorage.removeItem("lastActiveUser");
      } else if (currentUser !== storedUser) {
        // User changed - force page reload to reset all state properly
        window.location.reload();
      }
    };

    window.addEventListener("authUpdated", handleAuthChange);
    return () => window.removeEventListener("authUpdated", handleAuthChange);
  }, []);

  // ---------- Reconnect SSE if needed ----------
  useEffect(() => {
    let reconnectInterval = null;

    const checkAndReconnect = async () => {
      const cached = userStorage.getJSON("activeJob");
      if (!cached) return;
      if (!cached.id || cached.status !== "running") return;
      if (eventSourceRef.current) return;

      // Check if the cached job belongs to the current conversation
      const currentConversation = conversations[currentConversationIndex];
      if (
        !currentConversation ||
        cached.conversationId !== currentConversation.id
      ) {
        return; // Job belongs to a different conversation
      }

      try {
        const status = await api.getJobStatus(cached.id);
        if (!status) {
          userStorage.removeItem("activeJob");
          updateCurrentConversationJobState(null, false, null);
          return;
        }
        if (status.status === "running" || status.status === "pending") {
          updateCurrentConversationJobState(
            cached.id,
            true,
            status.progress || "Reconnecting to analysis..."
          );
          startJobMonitoring(cached.id, { fromReconnect: true });
        } else {
          userStorage.removeItem("activeJob");
          updateCurrentConversationJobState(null, false, null);
        }
      } catch {
        /* ignore */
      }
    };

    checkAndReconnect();
    reconnectInterval = setInterval(checkAndReconnect, 15000);

    const onVis = () =>
      document.visibilityState === "visible" && checkAndReconnect();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(reconnectInterval);
      document.removeEventListener("visibilitychange", onVis);
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
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
      if (
        !isUserScrolling &&
        autoScrollEnabled &&
        !isNearBottom &&
        isUserAtBottom
      ) {
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

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [currentConversationIndex, autoScrollEnabled, isUserAtBottom]);

  // ---------- Track unread messages when new messages arrive ----------
  const lastMessageCountRef = useRef(0);

  // Initialize message count tracking
  useEffect(() => {
    const msgs = conversations[currentConversationIndex]?.messages ?? [];
    lastMessageCountRef.current = msgs.length;
  }, []); // Only run on mount

  const msgs = conversations[currentConversationIndex]?.messages ?? [];
  const lastMessage = msgs[msgs.length - 1];

  useEffect(() => {
    const currentMessageCount = msgs.length;

    if (currentMessageCount > lastMessageCountRef.current) {
      const newMessagesCount =
        currentMessageCount - lastMessageCountRef.current;

      if (!isUserAtBottom) {
        setUnreadMessages((prev) => prev + newMessagesCount);
        console.log(
          `New messages detected: ${newMessagesCount}, Total unread: ${
            unreadMessages + newMessagesCount
          }`
        );
      }
      lastMessageCountRef.current = currentMessageCount;
    }

    if (isUserAtBottom && autoScrollEnabled) {
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.resetAfterIndex(currentMessageCount - 1, true);
          listRef.current.scrollToItem(currentMessageCount - 1, "end");
        }
      });
    }
  }, [lastMessage?.timestamp, isUserAtBottom, autoScrollEnabled, msgs.length]);

  // ---------- Helpers ----------
  const parseAnalysisRequest = (textIn) => {
    const email = localStorage.getItem("auth_email");
    const req = { request: textIn, email };
    Object.keys(analysisParams).forEach((k) => {
      const v = analysisParams[k];
      if (v !== undefined && v !== null && v !== "") req[k] = v;
    });
    return req;
  };

  // Get current conversation's job state
  const getCurrentConversationJobId = () => {
    const jobId = conversations[currentConversationIndex]?.activeJobId || null;
    if (jobId) {
      console.log(
        "🆔 Current conversation job ID:",
        jobId,
        "for conversation:",
        currentConversationIndex
      );
    }
    return jobId;
  };

  const getCurrentConversationStreamingState = () => {
    const isStreaming =
      conversations[currentConversationIndex]?.isStreaming || false;
    return isStreaming;
  };

  const getCurrentConversationProgress = () => {
    const progress =
      conversations[currentConversationIndex]?.jobProgress || null;
    if (progress) {
      console.log("📊 Current progress:", progress);
    }
    return progress;
  };

  // Update current conversation's job state
  const updateCurrentConversationJobState = (
    jobId,
    streaming = false,
    progress = null
  ) => {
    console.log("🔄 Updating conversation job state:", {
      jobId,
      streaming,
      progress,
      currentConversationIndex,
    });

    setConversations((prev) => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex];
      if (convo) {
        console.log("📝 Job state change:", {
          previousJobId: convo.activeJobId,
          newJobId: jobId,
          previousProgress: convo.jobProgress,
          newProgress: progress,
          previousStreaming: convo.isStreaming,
          newStreaming: streaming,
        });
        updated[currentConversationIndex] = {
          ...convo,
          activeJobId: jobId,
          isStreaming: streaming,
          jobProgress: progress,
        };
      }
      return updated;
    });
  };

  // Manual scroll to bottom function for user interaction
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const count =
        conversations[currentConversationIndex]?.messages?.length || 0;
      if (count > 0 && listRef.current) {
        listRef.current.resetAfterIndex(count - 1, true);
        listRef.current.scrollToItem(count - 1, "end");
        setShowScrollToBottom(false);
        setUnreadMessages(0);
        setAutoScrollEnabled(true); // Re-enable auto-scroll when user manually goes to bottom
        console.log("Manual scroll to bottom - auto-scroll re-enabled");
      }
    });
  };

  // log batch bubble
  const addAssistantLogBatch = (lines) => {
    if (!Array.isArray(lines) || lines.length === 0) return;
    const nowIso = new Date().toISOString();
    setConversations((prev) => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex];
      const msgs = [...(convo.messages || [])];
      const last = msgs[msgs.length - 1];

      if (last && last.role === "assistant" && last.kind === "logbatch") {
        msgs[msgs.length - 1] = {
          ...last,
          lines: (last.lines || []).concat(lines),
          content: (last.lines || []).concat(lines).join("\n"),
          timestamp: nowIso,
        };
      } else {
        msgs.push({
          role: "assistant",
          kind: "logbatch",
          lines: [...lines],
          content: lines.join("\n"),
          timestamp: nowIso,
        });
      }
      updated[currentConversationIndex] = { ...convo, messages: msgs };
      return updated;
    });
  };

  const addAssistantMessage = (content) => {
    const COALESCE_MS = 3000;
    setConversations((prev) => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex] ?? {
        id: Date.now(),
        title: "New Analysis",
        messages: [],
      };
      const msgs = [...(convo.messages || [])];

      const nowIso = new Date().toISOString();
      const last = msgs[msgs.length - 1];
      const canCoalesce =
        last &&
        last.role === "assistant" &&
        !last.kind &&
        last.timestamp &&
        Date.now() - new Date(last.timestamp).getTime() <= COALESCE_MS;

      if (canCoalesce) {
        msgs[msgs.length - 1] = {
          ...last,
          content: `${last.content}\n${content}`,
          timestamp: nowIso,
        };
      } else {
        msgs.push({ role: "assistant", content, timestamp: nowIso });
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
    setConversations((prev) => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex];
      const msgs = [...(convo.messages || [])];
      msgs.push({
        role: "assistant",
        kind: "downloads",
        jobId,
        entries,
        content: `Downloads available (${entries.length})`,
        timestamp: nowIso,
      });
      updated[currentConversationIndex] = { ...convo, messages: msgs };
      return updated;
    });
  };

  const addReportMessage = (reportContent, reportType = "deterministic") => {
    const nowIso = new Date().toISOString();
    setConversations((prev) => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex];
      const msgs = [...(convo.messages || [])];
      msgs.push({
        role: "assistant",
        kind: "report",
        reportType: reportType,
        content: reportContent,
        timestamp: nowIso,
      });
      updated[currentConversationIndex] = { ...convo, messages: msgs };
      return updated;
    });
  };

  const generateTitle = (userMessage) => {
    const text = userMessage.toLowerCase();
    if (text.includes("analyze") || text.includes("analysis")) {
      const tickerMatch = userMessage.match(/\b([A-Z]{1,5})\b/);
      return tickerMatch ? `${tickerMatch[1]} Analysis` : "Stock Analysis";
    }
    const words = userMessage.split(" ").slice(0, 3).join(" ");
    return words.length > 20 ? words.substring(0, 20) + "..." : words;
  };

  const startNewConversation = () => {
    const newConversation = {
      id: Date.now(),
      title: "New Analysis",
      messages: [createWelcomeMessage()],
      activeJobId: null, // Each conversation tracks its own job
      isStreaming: false,
      jobProgress: null,
    };
    setConversations([...conversations, newConversation]);
    setCurrentConversationIndex(conversations.length);
    rowHeightsRef.current = {};
    setShowScrollToBottom(false);
    setUnreadMessages(0);
    setIsUserAtBottom(true);
    setAutoScrollEnabled(true);

    // Only clear UI states, don't affect running jobs in other conversations
    setIsStoppingJob(false);

    // Reset report capture state
    reportCaptureRef.current = {
      isCapturing: false,
      content: "",
      reportType: "",
      reports: { deterministic: "", llm: "" },
    };

    // Reset message count tracking for new conversation
    lastMessageCountRef.current = 1; // One welcome message

    // Scroll to bottom for new conversation
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, true);
        listRef.current.scrollToItem(0, "end");
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
      content: "",
      reportType: "",
      reports: { deterministic: "", llm: "" },
    };

    // Reset message count tracking for new conversation
    const msgs = conversations[index]?.messages ?? [];
    lastMessageCountRef.current = msgs.length;

    // Scroll to bottom after switching conversation
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, true);
        const msgs = conversations[index]?.messages ?? [];
        if (msgs.length > 0) {
          listRef.current.scrollToItem(msgs.length - 1, "end");
        }
      }
    });
  };

  // Toggle log panel collapse state
  const toggleLogCollapse = (messageIndex) => {
    setCollapsedLogs((prev) => {
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
    const currentJobId = getCurrentConversationJobId();
    if (!currentJobId || isStoppingJob) return;

    console.log("🛑 Stopping job:", currentJobId);
    setIsStoppingJob(true);

    try {
      // FIRST: Close connections immediately to prevent state conflicts
      if (eventSourceRef.current) {
        console.log("🛑 Closing EventSource connection");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (progressPollRef.current) {
        console.log("🛑 Clearing periodic status check");
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }

      // SECOND: Check if job still exists and is stoppable
      const status = await api.getJobStatus(currentJobId).catch(() => null);
      console.log("🛑 Current job status before stopping:", status);

      if (
        !status ||
        status.status === "completed" ||
        status.status === "failed" ||
        status.status === "stopped"
      ) {
        console.log("🛑 Job already finished, cleaning up UI state");
        // Job already finished, just clean up UI state
        updateCurrentConversationJobState(null, false, null);

        // Clear global storage if this is the current active job
        const cachedJob = userStorage.getJSON("activeJob");
        if (cachedJob && cachedJob.id === currentJobId) {
          userStorage.removeItem("activeJob");
        }

        return;
      }

      // THIRD: Attempt to stop the job
      const result = await api.stopJob(currentJobId);
      console.log("🛑 Stop job result:", result);

      // FOURTH: Clear current conversation's job state (now that connections are closed)
      updateCurrentConversationJobState(null, false, null);

      // FIFTH: Clear global storage if this is the current active job
      const cachedJob = userStorage.getJSON("activeJob");
      if (cachedJob && cachedJob.id === currentJobId) {
        userStorage.removeItem("activeJob");
      }

      console.log("🛑 Job stopped successfully:", result);
    } catch (error) {
      console.error("🛑 Failed to stop job:", error);

      // Even if stop failed, clean up UI state to prevent stuck state
      console.log("🛑 Cleaning up UI state despite stop failure");
      updateCurrentConversationJobState(null, false, null);
    } finally {
      setIsStoppingJob(false);
    }
  };

  // ---------- Submits ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Get current conversation's job state
    const currentJobId = getCurrentConversationJobId();
    const currentStreaming = getCurrentConversationStreamingState();

    // If there's an active job in this conversation, stop it instead of starting a new one
    if (currentJobId) {
      await handleStopJob();
      return;
    }

    if (!input.trim() || currentStreaming) return;

    const userMessage = { role: "user", content: input };
    setConversations((prev) => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex] ?? {
        id: Date.now(),
        title: "New Analysis",
        messages: [],
        activeJobId: null,
        isStreaming: false,
        jobProgress: null,
      };
      const msgs = [...(convo.messages || [])]; // clone messages
      msgs.push(userMessage); // pure append
      updated[currentConversationIndex] = { ...convo, messages: msgs }; // replace convo
      return updated;
    });

    const currentInput = input;
    setInput("");
    // Don't clear jobId initially - keep existing job state during transition
    updateCurrentConversationJobState(
      currentJobId,
      true,
      "Starting analysis..."
    ); // Keep current job ID if any, mark as streaming

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
      console.log("🎯 Analysis started with job ID:", result.job_id);
      updateCurrentConversationJobState(
        result.job_id,
        true,
        "Initializing analysis..."
      ); // Set new job ID, streaming, and initial progress
      userStorage.setJSON("activeJob", {
        id: result.job_id,
        started: Date.now(),
        status: "running",
        conversationId: conversations[currentConversationIndex].id,
      });

      // Start both SSE monitoring and periodic status checking
      startJobMonitoring(result.job_id);
      startPeriodicStatusCheck(result.job_id);

      if (conversations[currentConversationIndex].title === "New Analysis") {
        const newTitle = `${result.ticker} Stock Analysis`;
        setConversations((prev) => {
          const updated = [...prev];
          updated[currentConversationIndex].title = newTitle;
          return updated;
        });
      }
    } catch (error) {
      addAssistantMessage(`❌ **Analysis Failed:** ${error.message}`);
      updateCurrentConversationJobState(null, false, null); // Clear job state on error
    }
  };

  // ---------- SSE monitoring ----------
  const startJobMonitoring = (jobId, opts = {}) => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {}
      eventSourceRef.current = null;
    }
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }

    const BATCH_LATENCY_MS = 200;
    const BATCH_COUNT_CAP = 200;
    const BATCH_BYTE_CAP = 32_000;

    let batch = [];
    let batchBytes = 0;
    let flushTimer = null;

    const queue = (text, kind = "log") => {
      if (kind !== "log") {
        addAssistantMessage(text);
        return;
      }
      const s = typeof text === "string" ? text : String(text);

      // Extract progress from log messages
      const progressPatterns = [
        // Common progress indicators - more flexible matching
        /(?:Starting|Initiating|Beginning)\s+(.{10,60})(?:\.|$)/i,
        /(?:Fetching|Downloading|Getting)\s+(.{10,60})(?:\.|$)/i,
        /(?:Processing|Analyzing|Parsing)\s+(.{10,60})(?:\.|$)/i,
        /(?:Generating|Creating|Building)\s+(.{10,60})(?:\.|$)/i,
        /(?:Running|Executing|Performing)\s+(.{10,60})(?:\.|$)/i,
        /(?:Scraping|Collecting)\s+(.{10,60})(?:\.|$)/i,
        /(?:Filtering|Sorting)\s+(.{10,60})(?:\.|$)/i,
        /(?:Calculating|Computing)\s+(.{10,60})(?:\.|$)/i,
        /(?:Loading|Importing)\s+(.{10,60})(?:\.|$)/i,
        /(?:Preparing|Setting up)\s+(.{10,60})(?:\.|$)/i,
        /(?:Saving|Storing)\s+(.{10,60})(?:\.|$)/i,
        // Emoji patterns - broader capture
        /[📊📈📉🔍💰🎯⚡🚀📋📄📑💹🏢📰📊]\s*(.{5,80})(?:\.|$)/,
        // Pipeline/step indicators
        /Step\s+\d+[:\-\s]+(.{10,60})(?:\.|$)/i,
        /Phase\s+\d+[:\-\s]+(.{10,60})(?:\.|$)/i,
        // Status/progress indicators
        /(?:Status|Progress)[:\-\s]+(.{10,60})(?:\.|$)/i,
        // Stock-specific patterns
        /(?:Ticker|Company|Stock)\s+[A-Z]{1,5}[:\-\s]+(.{10,60})(?:\.|$)/i,
      ];

      for (const pattern of progressPatterns) {
        const match = s.match(pattern);
        if (match && match[1]) {
          let progressText = match[1].trim();

          // Clean up common noise from extracted text
          progressText = progressText
            .replace(/^\W+|\W+$/g, "") // Remove leading/trailing non-word chars
            .replace(/\s+/g, " ") // Normalize whitespace
            .replace(/\.+$/, ""); // Remove trailing dots

          if (progressText.length >= 5 && progressText.length <= 80) {
            // Reasonable length
            console.log(
              "📈 Extracted progress from log:",
              `"${progressText}"`,
              "from line:",
              s.substring(0, 100)
            );
            // Use the jobId parameter to maintain consistency
            updateCurrentConversationJobState(jobId, true, progressText);
            break; // Use first match
          }
        }
      }

      // Check for deterministic explanation report start
      if (s.includes("📄 Financial analysis summary generated successfully:")) {
        console.log(
          "🔍 Detected deterministic report marker, starting capture..."
        );
        reportCaptureRef.current.isCapturing = true;
        reportCaptureRef.current.content = "";
        reportCaptureRef.current.reportType = "deterministic";

        // Extract content after the marker if it's on the same line
        const markerIndex = s.indexOf(
          "📄 Financial analysis summary generated successfully:"
        );
        const afterMarker = s
          .substring(
            markerIndex +
              "📄 Financial analysis summary generated successfully:".length
          )
          .trim();
        if (afterMarker) {
          reportCaptureRef.current.content = afterMarker;
          console.log(
            "📝 Initial financial analysis summary content captured:",
            afterMarker.substring(0, 100) + "..."
          );
        }
      }
      // Check for LLM explanation report start
      else if (
        s.includes("📄 Professional analyst report generated successfully:")
      ) {
        console.log("🔍 Detected LLM report marker, starting capture...");
        reportCaptureRef.current.isCapturing = true;
        reportCaptureRef.current.content = "";
        reportCaptureRef.current.reportType = "llm";

        // Extract content after the marker if it's on the same line
        const markerIndex = s.indexOf(
          "📄 Professional analyst report generated successfully:"
        );
        const afterMarker = s
          .substring(
            markerIndex +
              "📄 Professional analyst report generated successfully:".length
          )
          .trim();
        if (afterMarker) {
          reportCaptureRef.current.content = afterMarker;
          console.log(
            "📝 Professional analyst report content captured:",
            afterMarker.substring(0, 100) + "..."
          );
        }
      }
      // If we're capturing, add to the report content
      else if (reportCaptureRef.current.isCapturing) {
        // Stop capturing when we hit certain patterns that indicate end of report
        if (
          s.match(
            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| (INFO|DEBUG|WARNING|ERROR)/
          )
        ) {
          // This looks like a new log entry, finalize current report and stop capturing
          console.log("🛑 Stopping report capture (detected new log entry)");

          // Store the completed report
          if (
            reportCaptureRef.current.reportType &&
            reportCaptureRef.current.content.trim()
          ) {
            reportCaptureRef.current.reports[
              reportCaptureRef.current.reportType
            ] = reportCaptureRef.current.content.trim();
            console.log(
              "💾 Stored",
              reportCaptureRef.current.reportType,
              "report, length:",
              reportCaptureRef.current.content.trim().length
            );
          }

          reportCaptureRef.current.isCapturing = false;
          reportCaptureRef.current.content = "";
          reportCaptureRef.current.reportType = "";
        } else {
          // Continue capturing
          if (reportCaptureRef.current.content) {
            reportCaptureRef.current.content += "\n" + s;
          } else {
            reportCaptureRef.current.content = s;
          }
          console.log(
            "📝 Added to",
            reportCaptureRef.current.reportType,
            "report content:",
            s.substring(0, 50) + "..."
          );
        }
      }

      batch.push(s);
      batchBytes += s.length + 1;
      if (batch.length >= BATCH_COUNT_CAP || batchBytes >= BATCH_BYTE_CAP) {
        flush();
        return;
      }
      if (!flushTimer) flushTimer = setTimeout(flush, BATCH_LATENCY_MS);
    };

    const flush = () => {
      if (!batch.length) {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        return;
      }
      const lines = batch;
      batch = [];
      batchBytes = 0;
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      addAssistantLogBatch(lines);
      const count =
        conversations[currentConversationIndex]?.messages?.length || 0;
      if (count > 0) listRef.current?.resetAfterIndex(count - 1);
    };

    const finalizeDone = (status = "completed", note) => {
      flush();

      // Finalize any currently capturing report
      if (
        reportCaptureRef.current.isCapturing &&
        reportCaptureRef.current.reportType &&
        reportCaptureRef.current.content.trim()
      ) {
        reportCaptureRef.current.reports[reportCaptureRef.current.reportType] =
          reportCaptureRef.current.content.trim();
        console.log(
          "� Finalized",
          reportCaptureRef.current.reportType,
          "report during completion"
        );
        reportCaptureRef.current.isCapturing = false;
        reportCaptureRef.current.content = "";
        reportCaptureRef.current.reportType = "";
      }

      // Display both captured reports if available
      if (reportCaptureRef.current.reports.deterministic) {
        console.log(
          "📊 Displaying deterministic report with length:",
          reportCaptureRef.current.reports.deterministic.length
        );
        addReportMessage(
          reportCaptureRef.current.reports.deterministic,
          "deterministic"
        );
      }

      if (reportCaptureRef.current.reports.llm) {
        console.log(
          "🤖 Displaying LLM report with length:",
          reportCaptureRef.current.reports.llm.length
        );
        addReportMessage(reportCaptureRef.current.reports.llm, "llm");
      }

      if (
        !reportCaptureRef.current.reports.deterministic &&
        !reportCaptureRef.current.reports.llm
      ) {
        console.log("⚠️ No reports captured");
      }

      // Reset report capture state
      reportCaptureRef.current.reports = { deterministic: "", llm: "" };

      addAssistantMessage(
        `🏁 **Analysis Complete**${note ? `: ${note}` : ""}.`
      );
      console.log("🏁 Analysis completed, clearing job state for job:", jobId);

      // Add a small delay before clearing to ensure UI updates properly
      setTimeout(() => {
        updateCurrentConversationJobState(null, false, null); // Clear job state for current conversation
        userStorage.removeItem("activeJob");
        console.log("✅ Job state cleared after completion");
      }, 1000); // 1 second delay
      (async () => {
        try {
          const detail = await api.getDetailedStatus(jobId);
          if (detail) {
            const files = detail.files_available || detail.files || {};
            console.log(files);
            const ticker = (detail.ticker || "").toUpperCase();
            const mapped = buildDownloadEntries(api.base, jobId, ticker, files);
            if (Object.keys(mapped).length > 0) {
              setAvailableFiles(mapped);
              addDownloadsMessage(jobId, mapped);
            }
          }
        } catch {
          /* ignore */
        }
      })();
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
    };

    const finalizeFail = (status = "failed", detail) => {
      flush();
      addAssistantMessage(
        `❌ **Analysis Failed** (status: ${status})${
          detail ? `\n\n${detail}` : ""
        }`
      );
      console.log("❌ Analysis failed, clearing job state for job:", jobId);

      // Add a small delay before clearing to ensure UI updates properly
      setTimeout(() => {
        updateCurrentConversationJobState(null, false, null); // Clear job state for current conversation
        userStorage.removeItem("activeJob");
        console.log("✅ Job state cleared after failure");
      }, 1000); // 1 second delay
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
    };

    // open EventSource via API helper
    const es = api.openLogStream(jobId, {
      onOpen: () => {
        addAssistantMessage(
          opts.fromReconnect
            ? `🔄 **Reconnected to analysis job ${jobId}**`
            : `🔗 **Connected to analysis job ${jobId}**`
        );
      },
      onStatus: (payload) => {
        const { message, progress } = payload || {};
        console.log("📡 SSE onStatus received:", {
          message,
          progress,
          payload,
        });

        // Update conversation progress - prefer progress field, fallback to message
        const progressText = progress || message;
        if (progressText && typeof progressText === "string") {
          // Clean up the progress text
          const cleanProgress = progressText
            .replace(/^\*\*Status[^:]*:\s*/i, "") // Remove "**Status:** " prefix
            .replace(/^\*\*[^:]*:\s*/i, "") // Remove any "**...:** " prefix
            .replace(/\*\*/g, "") // Remove ** markdown
            .trim();

          if (cleanProgress && cleanProgress.length > 0) {
            console.log("📈 Progress update:", cleanProgress);
            // Use the jobId parameter to avoid race conditions with state reads
            updateCurrentConversationJobState(jobId, true, cleanProgress);
          }
        }
        queue(
          progress
            ? `**Status Update:** ${progress}`
            : `**Status:** ${message}`,
          "status"
        );
      },
      onLog: (payload) => {
        const { message } = payload || {};
        if (Array.isArray(message)) message.forEach((m) => queue(m, "log"));
        else if (message) {
          if (/ENTIRE PROGRAM.*COMPLETED/i.test(message)) {
            finalizeDone("completed", "Analysis completed");
            return;
          }
          queue(message, "log");
        }
      },
      onLogBatch: (payload) => {
        const { message } = payload || {};
        if (Array.isArray(message)) message.forEach((m) => queue(m, "log"));
      },
      onCompleted: (payload) => {
        try {
          const { message, status } = payload || {};
          finalizeDone(status || "completed", message);
        } catch {
          finalizeDone("completed");
        }
      },
      onServerError: (payload) => {
        const { message, detail, status } = payload || {};
        finalizeFail(
          status || "failed",
          detail || message || "Server signaled error"
        );
      },
      onErrorEvent: () => {
        console.log("🔌 SSE Error Event - ReadyState:", es.readyState);
        if (es.readyState === 2) {
          // CLOSED
          flush();
          console.log("🔌 SSE Connection closed by server");

          // Don't immediately clear job state - the job might still be running
          // Instead, check job status first
          setTimeout(async () => {
            try {
              const status = await api.getJobStatus(jobId);
              console.log("📊 Job status after SSE close:", status);

              if (
                status &&
                (status.status === "completed" || status.status === "failed")
              ) {
                addAssistantMessage(
                  "ℹ️ **Analysis completed. Connection closed.**"
                );
                updateCurrentConversationJobState(null, false, null);
                userStorage.removeItem("activeJob");
              } else {
                addAssistantMessage(
                  "⚠️ **Connection lost. Monitoring may resume automatically.**"
                );
                // Keep job state but mark as not streaming
                updateCurrentConversationJobState(
                  jobId,
                  false,
                  "Connection lost - monitoring..."
                );
              }
            } catch (error) {
              console.log("Failed to check job status after SSE close:", error);
              addAssistantMessage("ℹ️ **Connection closed.**");
            }
          }, 500);

          try {
            es.close();
          } catch {}
          eventSourceRef.current = null;
        } else {
          flush();
          addAssistantMessage(
            "⚠️ **Connection issue:** Monitoring may resume automatically."
          );
        }
      },
    });

    eventSourceRef.current = es;
  };

  // ---------- Periodic Status Check ----------
  const startPeriodicStatusCheck = (jobId) => {
    // Clear any existing status check interval
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }

    console.log("🔄 Starting periodic status check for job:", jobId);
    let failureCount = 0;
    const maxFailures = 3;

    progressPollRef.current = setInterval(async () => {
      try {
        // Add timeout to prevent hanging requests
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 5000);

        const status = await api.getJobStatus(jobId);
        clearTimeout(timeoutId);

        console.log("📊 Periodic status check result:", status);

        if (status) {
          failureCount = 0; // Reset failure count on success

          // Update progress if available, but preserve current streaming state
          if (
            status.progress &&
            status.progress !== getCurrentConversationProgress()
          ) {
            console.log(
              "📈 Updating progress from status check:",
              status.progress
            );
            // Only update if job is still running/active
            if (
              status.status === "running" ||
              status.status === "processing" ||
              status.status === "active"
            ) {
              updateCurrentConversationJobState(jobId, true, status.progress);
            }
          }

          // Check if job is complete
          if (
            status.status === "completed" ||
            status.status === "failed" ||
            status.status === "stopped"
          ) {
            console.log("🏁 Job completed via status check:", status.status);
            clearInterval(progressPollRef.current);
            progressPollRef.current = null;

            // Don't clear job state immediately - let the SSE handler do it
            // or give a delay for UI to show completion state
          }
        } else {
          failureCount++;
          console.log(
            `❌ Job status check returned null (failure ${failureCount}/${maxFailures}) - job may be gone`
          );

          if (failureCount >= maxFailures) {
            console.log(
              "❌ Too many status check failures, stopping periodic check"
            );
            clearInterval(progressPollRef.current);
            progressPollRef.current = null;
          }
        }
      } catch (error) {
        failureCount++;
        console.log(
          `❌ Error checking job status (failure ${failureCount}/${maxFailures}):`,
          error
        );

        if (failureCount >= maxFailures) {
          console.log(
            "❌ Too many status check errors, stopping periodic check"
          );
          clearInterval(progressPollRef.current);
          progressPollRef.current = null;
        }
      }
    }, 3000); // Check every 3 seconds
  };

  // ---------- Downloads ----------
  const saveBlob = async (blob, suggestedName) => {
    const supportsFS = "showSaveFilePicker" in window;
    if (supportsFS) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "Excel Workbook",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1500);
    }
  };

  const handleDownload = async (entryOrKey) => {
    try {
      const entry =
        typeof entryOrKey === "string"
          ? availableFiles[entryOrKey]
          : entryOrKey;
      if (!entry?.url) throw new Error("Unknown download type");
      const { blob, filename } = await downloadByEntry(entry);
      await saveBlob(
        blob,
        filename || entry.suggestedName || entry.label || "download.xlsx"
      );
      addAssistantMessage(`✅ **Downloaded:** ${filename}`);
    } catch (e) {
      if (
        typeof e.message === "string" &&
        e.message.includes("The user aborted a request")
      ) {
        return;
      }
      console.error("Download error:", e);
      addAssistantMessage(`❌ **Download Failed:** ${e.message}`);
    }
  };

  // ---------- Row renderer (UI refresh) ----------
  const Row = ({ index, style, data }) => {
    const message = data[index];
    const isUser = message.role === "user";
    const isLogBatch = message.kind === "logbatch";
    const isDownloads = message.kind === "downloads";
    const isReport = message.kind === "report";
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
            : "bg-white text-slate-800 ring-slate-200",
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
                  {Array.isArray(message.entries) &&
                    message.entries.map((entry) => (
                      <button
                        key={entry.key}
                        onClick={() => handleDownload(entry)}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
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
                  <span className="text-[11px] tracking-wide font-semibold text-slate-700 uppercase">
                    Live Analysis Log
                  </span>
                </div>
                <button
                  onClick={() => toggleLogCollapse(index)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  aria-label={
                    collapsedLogs.has(index) ? "Expand log" : "Collapse log"
                  }
                >
                  <span className="text-[10px] font-medium text-slate-600">
                    {collapsedLogs.has(index) ? "Show" : "Hide"}
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
                    {message.lines ? message.lines.join("\n") : message.content}
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
                    Log collapsed ({message.lines ? message.lines.length : "1"}{" "}
                    lines)
                  </span>
                </div>
              )}
            </div>
          ) : isReport ? (
            <div
              ref={measureRef}
              className={`inline-block max-w-[1000px] rounded-2xl overflow-hidden shadow-lg ring-1 ${
                message.reportType === "llm"
                  ? "bg-gradient-to-br from-purple-50 to-pink-50 ring-purple-200"
                  : "bg-gradient-to-br from-indigo-50 to-blue-50 ring-indigo-200"
              }`}
            >
              <div
                className={`flex items-center gap-3 px-5 py-3 border-b ${
                  message.reportType === "llm"
                    ? "border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100"
                    : "border-indigo-200 bg-gradient-to-r from-indigo-100 to-blue-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full shadow-sm ${
                      message.reportType === "llm"
                        ? "bg-purple-500"
                        : "bg-indigo-500"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold tracking-wide ${
                      message.reportType === "llm"
                        ? "text-purple-900"
                        : "text-indigo-900"
                    }`}
                  >
                    {message.reportType === "llm"
                      ? "📑 LLM ANALYSIS REPORT"
                      : "📊 DETERMINISTIC ANALYSIS REPORT"}
                  </span>
                </div>
                <span
                  className={`ml-auto text-xs font-medium bg-white/60 px-2 py-1 rounded-full ${
                    message.reportType === "llm"
                      ? "text-purple-600"
                      : "text-indigo-600"
                  }`}
                >
                  {message.reportType === "llm"
                    ? "AI-Generated Output"
                    : "Deterministic Model Output"}
                </span>
              </div>
              <div className="p-5 bg-white/80">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  className={`prose prose-sm max-w-none break-words prose-headings:font-bold prose-p:leading-relaxed prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 ${
                    message.reportType === "llm"
                      ? "prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-purple-700 prose-code:bg-purple-50 prose-code:text-purple-800"
                      : "prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-indigo-700 prose-code:bg-indigo-50 prose-code:text-indigo-800"
                  }`}
                  components={{
                    h1: ({ children }) => (
                      <h1
                        className={`text-xl font-bold mb-3 pb-2 border-b ${
                          message.reportType === "llm"
                            ? "text-purple-900 border-purple-200"
                            : "text-indigo-900 border-indigo-200"
                        }`}
                      >
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2
                        className={`text-lg font-semibold mb-2 mt-4 ${
                          message.reportType === "llm"
                            ? "text-purple-800"
                            : "text-indigo-800"
                        }`}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-medium text-slate-700 mb-2 mt-3">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-slate-600 leading-relaxed mb-3">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 text-slate-600 mb-3">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 mb-3">
                        {children}
                      </ol>
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
                    tbody: ({ children }) => <tbody>{children}</tbody>,
                    tr: ({ children }) => (
                      <tr className="border-b border-slate-200">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-slate-300 px-3 py-2 text-slate-600">
                        {children}
                      </td>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-3">
                        {children}
                      </blockquote>
                    ),
                    br: () => <br className="my-1" />,
                    code: ({ node, inline, children, ...props }) =>
                      inline ? (
                        <code
                          className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                            message.reportType === "llm"
                              ? "bg-purple-50 text-purple-800"
                              : "bg-indigo-50 text-indigo-800"
                          }`}
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <pre
                          className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm font-mono text-slate-700 overflow-x-auto"
                          {...props}
                        >
                          <code>{children}</code>
                        </pre>
                      ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              <div
                className={`px-5 py-3 border-t ${
                  message.reportType === "llm"
                    ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
                    : "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200"
                }`}
              >
                <div
                  className={`flex items-center justify-between text-xs ${
                    message.reportType === "llm"
                      ? "text-purple-600"
                      : "text-indigo-600"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        message.reportType === "llm"
                          ? "bg-purple-400"
                          : "bg-indigo-400"
                      }`}
                    />
                    Generated by VYNN AI Agent
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
                      ${isUser ? "prose-invert" : "prose-slate"}`}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <div className="overflow-x-auto rounded-md ring-1 ring-slate-200">
                        <SyntaxHighlighter
                          {...props}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, maxWidth: "100%" }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code
                        {...props}
                        className={`${className} break-all px-1.5 py-0.5 rounded ${
                          isUser ? "bg-white/20 text-white" : "bg-slate-100"
                        }`}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ node, children, ...props }) {
                    return (
                      <pre
                        {...props}
                        className="whitespace-pre-wrap break-words overflow-x-auto rounded-md ring-1 ring-slate-200 bg-slate-50 p-3"
                      >
                        {children}
                      </pre>
                    );
                  },
                  p({ node, children, ...props }) {
                    return (
                      <p {...props} className="break-words">
                        {children}
                      </p>
                    );
                  },
                  ul({ node, children, ...props }) {
                    return (
                      <ul
                        {...props}
                        className="list-disc list-inside space-y-1 mb-3"
                      >
                        {children}
                      </ul>
                    );
                  },
                  ol({ node, children, ...props }) {
                    return (
                      <ol
                        {...props}
                        className="list-decimal list-inside space-y-1 mb-3"
                      >
                        {children}
                      </ol>
                    );
                  },
                  li({ node, children, ...props }) {
                    return (
                      <li {...props} className="break-words">
                        {children}
                      </li>
                    );
                  },
                  table({ node, children, ...props }) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table
                          {...props}
                          className="min-w-full border-collapse border border-slate-300"
                        >
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ node, children, ...props }) {
                    return (
                      <thead
                        {...props}
                        className={`${isUser ? "bg-white/20" : "bg-slate-100"}`}
                      >
                        {children}
                      </thead>
                    );
                  },
                  tbody({ node, children, ...props }) {
                    return <tbody {...props}>{children}</tbody>;
                  },
                  tr({ node, children, ...props }) {
                    return (
                      <tr
                        {...props}
                        className={`border-b ${
                          isUser ? "border-white/20" : "border-slate-200"
                        }`}
                      >
                        {children}
                      </tr>
                    );
                  },
                  th({ node, children, ...props }) {
                    return (
                      <th
                        {...props}
                        className={`border px-3 py-2 text-left font-semibold ${
                          isUser
                            ? "border-white/20 text-white"
                            : "border-slate-300 text-slate-700"
                        }`}
                      >
                        {children}
                      </th>
                    );
                  },
                  td({ node, children, ...props }) {
                    return (
                      <td
                        {...props}
                        className={`border px-3 py-2 ${
                          isUser
                            ? "border-white/20 text-white"
                            : "border-slate-300 text-slate-600"
                        }`}
                      >
                        {children}
                      </td>
                    );
                  },
                  blockquote({ node, children, ...props }) {
                    return (
                      <blockquote
                        {...props}
                        className={`border-l-4 pl-4 italic my-3 ${
                          isUser
                            ? "border-white/40 text-white/90"
                            : "border-slate-300 text-slate-600"
                        }`}
                      >
                        {children}
                      </blockquote>
                    );
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

  // OpenAI-style Progress Text Animation Component
  const ProgressText = ({ text, className = "" }) => {
    if (!text || typeof text !== "string") return null;

    return (
      <>
        <style>
          {`
            @keyframes gradient-flow {
              0% {
                background-position: -300% 0;
              }
              100% {
                background-position: 300% 0;
              }
            }
            .progress-text {
              background: linear-gradient(
                110deg,
                #9ca3af 0%,
                #6b7280 25%,
                #4b5563 35%,
                #374151 45%,
                #1f2937 55%,
                #374151 65%,
                #4b5563 75%,
                #6b7280 85%,
                #9ca3af 100%
              );
              background-size: 300% 100%;
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: gradient-flow 6s linear infinite;
              font-weight: 500;
              letter-spacing: 0.01em;
            }
            .progress-container {
              position: relative;
              overflow: hidden;
            }
            .progress-dots::before,
            .progress-dots::after {
              content: '';
              position: absolute;
              top: 50%;
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: #9ca3af;
              animation: dot-pulse 1.5s ease-in-out infinite;
              transform: translateY(-50%);
            }
            .progress-dots::before {
              left: -12px;
              animation-delay: 0s;
            }
            .progress-dots::after {
              right: -12px;
              animation-delay: 0.75s;
            }
            @keyframes dot-pulse {
              0%, 100% {
                opacity: 0.3;
                transform: translateY(-50%) scale(0.8);
              }
              50% {
                opacity: 1;
                transform: translateY(-50%) scale(1.2);
              }
            }
          `}
        </style>
        <div className={`progress-container progress-dots ${className}`}>
          <span className="progress-text">{text}</span>
        </div>
      </>
    );
  };

  const getItemSize = (index) =>
    rowHeightsRef.current[index] || DEFAULT_ROW_HEIGHT;

  // ---------- UI ----------
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100 overflow-x-hidden">
      <div className="relative">
        <Collapsible
          open={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
          className="bg-white border-r h-full"
        >
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
                        onSubmit={(e) => {
                          e.preventDefault();
                          commitRename();
                        }}
                        className="flex items-center gap-2 mb-1"
                      >
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelRename();
                          }}
                          className="h-9"
                        />
                        <Button type="submit" size="sm">
                          Save
                        </Button>
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
                          <DropdownMenuContent
                            align="start"
                            side="right"
                            className="w-44"
                          >
                            <DropdownMenuItem
                              onClick={() => startRename(c.id, c.title)}
                              className="flex items-center gap-2"
                            >
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
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-4 ${
                isSidebarOpen ? "left-64" : "left-0"
              } transition-all duration-300`}
            >
              {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      <div className="flex flex-col flex-grow h-full">
        <div className="flex justify-between items-center p-4 bg-white/90 backdrop-blur border-b">
          <div className="text-lg font-semibold text-gray-700 flex items-center gap-3">
            AI Stock Analyst
            {getCurrentConversationJobId() && (
              <div className="flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 ring-1 ring-gray-200/80 shadow-sm backdrop-blur-sm">
                <ProgressText
                  text={
                    getCurrentConversationProgress() || "Starting analysis..."
                  }
                  className="text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto relative" ref={listContainerRef}>
            <List
              ref={listRef}
              height={listHeight}
              width={"100%"}
              itemCount={
                conversations[currentConversationIndex].messages.length
              }
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
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>
                      {unreadMessages > 0
                        ? `${unreadMessages} new message${
                            unreadMessages > 1 ? "s" : ""
                          }`
                        : "Scroll to bottom"}
                    </p>
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
              disabled={
                getCurrentConversationJobId() ||
                getCurrentConversationStreamingState()
              }
            />
            <Button
              type="submit"
              disabled={
                isStoppingJob ||
                (!getCurrentConversationJobId() &&
                  (!input.trim() || getCurrentConversationStreamingState()))
              }
              className={`rounded-xl ${
                getCurrentConversationJobId()
                  ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              }`}
            >
              {getCurrentConversationJobId() ? (
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
                "Analyze"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

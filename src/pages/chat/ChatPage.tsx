import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { VariableSizeList as List } from "react-window";
import { api, buildDownloadEntries, downloadByEntry } from "@/lib/api";
import { userStorage } from "@/lib/userStorage.js";
import {
  AnalysisLogMessage,
  AnalysisReportMessage,
  ScrollToBottomButton,
  Bubble,
  ChatInput,
  ChatSidebar,
  DownloadMessage,
  ProgressText,
  Message,
} from "@/features/chat";
import { useConversations } from "@/hooks/chat/useConversations";

const ChatPage = () => {
  // ---------- Local state ----------
  const {
    conversations,
    currentConversationIndex,
    setCurrentConversationIndex,
    startNewConversation,
    deleteConversation,
    setConversations,
    addAssistantMessage,
    appendNLContent,
    addAssistantLogBatch,
    addDownloadsMessage,
    addReportMessage,
  } = useConversations();
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
  const handleDeleteConversation = (id: number) => {
    const idx = conversations.findIndex((c) => c.id === id);
    if (idx === -1) return;

    // If deleting the active convo, perform cleanup of running job state
    if (idx === currentConversationIndex) {
      const conversation = conversations[idx];
      if (conversation?.activeJobId) {
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

    // Ask hook to delete the conversation but preserve the index so we can compute/set it ourselves
    deleteConversation(id, { preserveIndex: true });

    // Compute the next index exactly like your original logic
    let nextIndex = currentConversationIndex;
    if (idx < currentConversationIndex) {
      nextIndex = Math.max(0, currentConversationIndex - 1);
    }
    if (idx === currentConversationIndex) {
      nextIndex = Math.max(0, idx - 1);
    }

    // Compute final list length after delete (we removed one item)
    const finalLength = Math.max(1, conversations.length - 1);
    setCurrentConversationIndex(Math.min(nextIndex, finalLength - 1));

    // If we were renaming this one, reset rename state
    if (renamingId === id) cancelRename();
  };

  const confirmDelete = (id) => {
    if (window.confirm("Delete this chat? This cannot be undone.")) {
      handleDeleteConversation(id);
    }
  };

  // ---------- Handle user changes ----------
  useEffect(() => {
    const currentUser = userStorage.getCurrentUser();
    const storedUser = localStorage.getItem("lastActiveUser");

    if (currentUser && currentUser !== storedUser) {
      // User has changed - reset state to new user's data
      localStorage.setItem("lastActiveUser", currentUser);

      // Load new user's data
      const newConversations = userStorage.getJSON("conversations");
      const newActiveJob = userStorage.getJSON("activeJob");

      if (newConversations) {
        setConversations(newConversations);
      } else {
        // First time user - create conversation with welcome message
        setConversations([
          {
            id: Date.now(),
            title: "New Analysis",
            messages: [],
            activeJobId: null,
            isStreaming: false,
            jobProgress: null,
            sessionId: null,
            isDraft: true,
          },
        ]);
      }

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

  const onStartNewConversation = () => {
    startNewConversation();
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
    lastMessageCountRef.current = 0;

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
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

    const userMessage: Message = { role: "user", content: input };
    setConversations((prev) => {
      const updated = [...prev];
      const convo = updated[currentConversationIndex] ?? {
        id: Date.now(),
        title: "New Analysis",
        messages: [],
        activeJobId: null,
        isStreaming: false,
        jobProgress: null,
        sessionId: null,
        isDraft: true,
      };
      const msgs = [...(convo.messages || [])]; // clone messages
      msgs.push(userMessage); // pure append
      updated[currentConversationIndex] = {
        ...convo,
        messages: msgs,
        isDraft: false,
      }; // replace convo
      return updated;
    });

    const currentInput = input;
    setInput("");
    // Don't clear jobId initially - keep existing job state during transition
    updateCurrentConversationJobState(currentJobId, true, "Starting chat..."); // Keep current job ID if any, mark as streaming

    try {
      const email = localStorage.getItem("auth_email");
      const currentConversation = conversations[currentConversationIndex];
      const sessionId = currentConversation?.sessionId || null;

      console.log("📤 Sending chat request with session_id:", sessionId);

      const chatRequest = {
        email: email,
        timestamp: new Date().toISOString(),
        user_prompt: currentInput,
        ...(sessionId && { session_id: sessionId }),
      };

      addAssistantMessage(
        `🚀 **Processing your request...**

⚡ **Connecting to AI assistant...**`
      );

      const result = await api.startChat(chatRequest);
      console.log("🎯 Chat started with job ID:", result.job_id);
      updateCurrentConversationJobState(
        result.job_id,
        true,
        "Initializing chat..."
      ); // Set new job ID, streaming, and initial progress

      // Start both SSE monitoring and periodic status checking
      const convId = conversations[currentConversationIndex].id;

      userStorage.setJSON("activeJob", {
        id: result.job_id,
        started: Date.now(),
        status: "running",
        conversationId: convId,
      });

      startJobMonitoring(result.job_id, { convId });
      startPeriodicStatusCheck(result.job_id);

      // Update conversation title if this is the first message
      if (conversations[currentConversationIndex].title === "New Analysis") {
        // Extract a short title from the user prompt
        const shortTitle =
          currentInput.length > 50
            ? currentInput.substring(0, 47) + "..."
            : currentInput;
        setConversations((prev) => {
          const updated = [...prev];
          updated[currentConversationIndex].title = shortTitle;
          return updated;
        });
      }
    } catch (error) {
      addAssistantMessage(`❌ **Chat Failed:** ${error.message}`);
      updateCurrentConversationJobState(null, false, null); // Clear job state on error
    }
  };

  // ---------- SSE monitoring ----------
  const startJobMonitoring = (jobId, opts = {}) => {
    const { convId } = opts;
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

    let logBatch = [];
    let nlBatch = [];
    let logBatchBytes = 0;
    let nlBatchBytes = 0;
    let flushTimer = null;

    const queue = (text, type = "LOG") => {
      const s = typeof text === "string" ? text : String(text);

      // Handle NL (natural language) messages separately
      if (type === "NL") {
        nlBatch.push(s);
        nlBatchBytes += s.length + 1;
        if (
          nlBatch.length >= BATCH_COUNT_CAP ||
          nlBatchBytes >= BATCH_BYTE_CAP
        ) {
          flush();
          return;
        }
        if (!flushTimer) flushTimer = setTimeout(flush, BATCH_LATENCY_MS);
        return;
      }

      // Handle LOG messages - Extract progress
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

      logBatch.push(s);
      logBatchBytes += s.length + 1;
      if (
        logBatch.length >= BATCH_COUNT_CAP ||
        logBatchBytes >= BATCH_BYTE_CAP
      ) {
        flush();
        return;
      }
      if (!flushTimer) flushTimer = setTimeout(flush, BATCH_LATENCY_MS);
    };

    // Helper function to extract clean NL content from LLM messages
    const extractNLContent = (nlMessages: string[]): string => {
      return nlMessages
        .map((line) => {
          // Remove timestamp prefix (e.g., "2025-11-07 02:01:00 | INFO | stock-analyst-AMZN | [LLM] ...")
          let cleaned = line.replace(
            /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*\|\s*\w+\s*\|\s*[\w-]+\s*\|\s*/,
            ""
          );

          // Remove [LLM] prefix
          cleaned = cleaned.replace(/^\[LLM\]\s*/, "");

          return cleaned.trim();
        })
        .filter((line) => line.length > 0) // Remove empty lines
        .join("\n");
    };

    const flush = () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      // Flush NL batch if we have any
      if (nlBatch.length > 0) {
        const cleanedNL = extractNLContent(nlBatch);
        console.log(
          "📝 Flushing NL batch (cleaned):",
          cleanedNL.substring(0, 100) + "..."
        );

        // Always append NL content to last message (works for both regular and logbatch messages)
        if (cleanedNL) {
          appendNLContent(cleanedNL, convId);
        }

        nlBatch = [];
        nlBatchBytes = 0;
      }

      // Flush log batch if we have any
      if (logBatch.length > 0) {
        const logLines = logBatch;
        // Add logs to existing logbatch or create new one
        addAssistantLogBatch(logLines, "", convId);
        logBatch = [];
        logBatchBytes = 0;
      }

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
          "deterministic",
          convId
        );
      }

      if (reportCaptureRef.current.reports.llm) {
        console.log(
          "🤖 Displaying LLM report with length:",
          reportCaptureRef.current.reports.llm.length
        );
        addReportMessage(reportCaptureRef.current.reports.llm, "llm", convId);
      }

      if (
        !reportCaptureRef.current.reports.deterministic &&
        !reportCaptureRef.current.reports.llm
      ) {
        console.log("⚠️ No reports captured");
      }

      // Reset report capture state
      reportCaptureRef.current.reports = { deterministic: "", llm: "" };

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
              addDownloadsMessage(jobId, mapped, convId);
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
        }`,
        convId
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
            ? `🔄 **Reconnected to analysis job**`
            : `🔗 **Connected to analysis job**`,
          convId
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
        const { message, type } = payload || {};
        const messageType = type || "LOG"; // Default to LOG if not specified

        if (Array.isArray(message)) {
          message.forEach((m) => queue(m, messageType));
        } else if (message) {
          if (/ENTIRE PROGRAM.*COMPLETED/i.test(message)) {
            finalizeDone("completed", "Chat completed");
            return;
          }
          queue(message, messageType);
        }
      },
      onLogBatch: (payload) => {
        const { message, type } = payload || {};
        const messageType = type || "LOG"; // Default to LOG if not specified

        if (Array.isArray(message)) {
          message.forEach((m) => queue(m, messageType));
        }
      },
      onCompleted: (payload) => {
        try {
          const { message, status, session_id } = payload || {};

          // Extract and store session_id if provided
          if (session_id) {
            console.log(
              "💾 Received session_id from completed event:",
              session_id
            );
            setConversations((prev) => {
              const next = [...prev];
              const idx = convId
                ? next.findIndex((c) => c.id === convId)
                : currentConversationIndex;
              if (next[idx]) {
                next[idx] = { ...next[idx], sessionId: session_id };
              }
              return next;
            });
          }

          finalizeDone(status || "completed", message);
        } catch {
          finalizeDone("completed", "Chat completed");
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
                  "ℹ️ **Analysis completed. Connection closed.**",
                  convId
                );
                updateCurrentConversationJobState(null, false, null);
                userStorage.removeItem("activeJob");
              } else {
                addAssistantMessage(
                  "⚠️ **Connection lost. Monitoring may resume automatically.**",
                  convId
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
              addAssistantMessage("ℹ️ **Connection closed.**", convId);
            }
          }, 500);

          try {
            es.close();
          } catch {}
          eventSourceRef.current = null;
        } else {
          flush();
          addAssistantMessage(
            "⚠️ **Connection issue:** Monitoring may resume automatically.",
            convId
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

  // Auto-collapse new log messages
  useEffect(() => {
    const currentMessages =
      conversations[currentConversationIndex]?.messages || [];
    const lastMessage = currentMessages[currentMessages.length - 1];

    // Only act if the last message is a log and hasn't been collapsed yet
    if (
      lastMessage &&
      (lastMessage.kind === "logbatch" || lastMessage.kind === "analysisLog") &&
      !collapsedLogs.has(currentMessages.length - 1)
    ) {
      // Add the new log message index to collapsed set
      setCollapsedLogs((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentMessages.length - 1);
        return newSet;
      });
    }
  }, [conversations[currentConversationIndex]?.messages.length]);

  // ---------- Row renderer (UI refresh) ----------
  const Row = useCallback(
    ({ index, style, data }) => {
      const message = data.messages[index];
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

      return (
        <div style={style} className="px-4 py-2">
          <div
            className={`flex w-full ${
              isUser ? "justify-center" : "justify-center"
            }`}
          >
            <div
              className={`w-full max-w-[900px] ${
                isUser ? "text-right" : "text-left"
              }`}
            >
              {isDownloads ? (
                <Bubble measureRef={measureRef} isUser={isUser}>
                  <DownloadMessage
                    message={message}
                    onDownload={handleDownload}
                  />
                </Bubble>
              ) : isLogBatch ? (
                <div ref={measureRef} className="max-w-[1000px]">
                  <AnalysisLogMessage
                    message={message}
                    index={index}
                    isCollapsed={collapsedLogs.has(index)}
                    toggleCollapse={toggleLogCollapse}
                    isStreaming={
                      data.isStreaming && index === data.messages.length - 1
                    }
                  />
                </div>
              ) : isReport ? (
                <AnalysisReportMessage
                  measureRef={measureRef}
                  message={message}
                />
              ) : (
                <Bubble measureRef={measureRef} isUser={isUser}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    className={`prose max-w-none break-words overflow-x-auto
                      prose-headings:my-2 prose-p:my-1 prose-pre:my-2 prose-blockquote:my-2
                      prose-ul:my-1 prose-ol:my-1 prose-li:my-0
                      prose-table:my-2
                      prose-img:my-2
                      ${isUser ? "prose-invert" : "prose-slate"}
                    `}
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
                            className={`${
                              isUser ? "bg-white/20" : "bg-slate-100"
                            }`}
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
        </div>
      );
    },
    [collapsedLogs]
  );

  const getItemSize = (index) =>
    rowHeightsRef.current[index] || DEFAULT_ROW_HEIGHT;

  const currentMessages =
    conversations[currentConversationIndex]?.messages ?? [];
  const isEmptyConversation = currentMessages.length === 0;

  // ---------- UI ----------
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100 overflow-x-hidden">
      <ChatSidebar
        isSidebarOpen={isSidebarOpen}
        onSidebarOpenChange={setIsSidebarOpen}
        conversations={conversations}
        activeConversationId={conversations[currentConversationIndex]?.id}
        renamingId={renamingId}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onStartNewConversation={onStartNewConversation}
        onSwitchConversation={switchConversationById}
        onStartRename={startRename}
        onCommitRename={commitRename}
        onCancelRename={cancelRename}
        onDeleteConversation={confirmDelete}
      />

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
            {isEmptyConversation ? (
              <div className="flex flex-col items-center justify-start text-center px-6 pt-[15vh]">
                <h1 className="text-3xl font-semibold text-slate-700 mb-2">
                  Vynn AI
                </h1>
                <p className="text-slate-500 mb-8">
                  Ask anything about markets, models, or financial data.
                </p>
                <div className="w-full max-w-xl">
                  <ChatInput
                    onSubmit={handleSubmit}
                    value={input}
                    onChange={(newValue) => setInput(newValue)}
                    isInputDisabled={
                      !!getCurrentConversationJobId() ||
                      getCurrentConversationStreamingState()
                    }
                    isButtonDisabled={
                      isStoppingJob ||
                      (!getCurrentConversationJobId() &&
                        (!input.trim() ||
                          getCurrentConversationStreamingState()))
                    }
                    isChatActive={!!getCurrentConversationJobId()}
                    isChatStopping={isStoppingJob}
                  />
                </div>
              </div>
            ) : (
              <>
                <List
                  ref={listRef}
                  height={listHeight}
                  width={"100%"}
                  itemCount={currentMessages.length}
                  itemSize={getItemSize}
                  itemData={conversations[currentConversationIndex]}
                  overscanCount={6}
                >
                  {Row}
                </List>

                {showScrollToBottom && (
                  <ScrollToBottomButton
                    scrollToBottom={scrollToBottom}
                    unreadMessages={unreadMessages}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {!isEmptyConversation ? (
          <div className="p-4">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                onSubmit={handleSubmit}
                value={input}
                onChange={(newValue) => setInput(newValue)}
                isInputDisabled={
                  !!getCurrentConversationJobId() ||
                  getCurrentConversationStreamingState()
                }
                isButtonDisabled={
                  isStoppingJob ||
                  (!getCurrentConversationJobId() &&
                    (!input.trim() || getCurrentConversationStreamingState()))
                }
                isChatActive={!!getCurrentConversationJobId()}
                isChatStopping={isStoppingJob}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChatPage;

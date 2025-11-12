// useConversations.ts
import { Conversation } from "@/features/chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { userStorage } from "@/lib/userStorage";

const createBlankConversation = (): Conversation => ({
  id: Date.now(),
  title: "New Analysis",
  messages: [],
  activeJobId: null,
  isStreaming: false,
  jobProgress: null,
  sessionId: null,
  isDraft: true,
  lastUsedAt: Date.now(),
});

export function useConversations(initialIndex = 0) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = userStorage.getJSON("conversations");
    if (saved) {
      return saved.map((c: any) => ({
        ...c,
        activeJobId: c.activeJobId || null,
        isStreaming: c.isStreaming || false,
        jobProgress: c.jobProgress || null,
        sessionId: c.sessionId || null,
        isDraft: typeof c.isDraft === "boolean" ? c.isDraft : false,
        lastUsedAt: c.lastUsedAt || Date.now(), // Initialize if missing
      }));
    }
    return [createBlankConversation()];
  });

  const [currentConversationIndex, setCurrentConversationIndex] =
    useState<number>(initialIndex);

  // persist to user storage when conversations change
  useEffect(() => {
    if (userStorage.hasUser()) {
      userStorage.setJSON("conversations", conversations);
    }
  }, [conversations]);

  // stable ref to avoid stale-closure issues
  const currentConversationIndexRef = useRef(currentConversationIndex);
  useEffect(() => {
    currentConversationIndexRef.current = currentConversationIndex;
  }, [currentConversationIndex]);

  // --- small helper to find a conversation index by id ---
  const findIndexById = useCallback((arr: Conversation[], convId?: number) => {
    if (typeof convId === "number") {
      const found = arr.findIndex((c) => c.id === convId);
      if (found !== -1) return found;
    }
    return currentConversationIndexRef.current ?? 0;
  }, []);

  // --- start new conversation ---
  const startNewConversation = useCallback(() => {
    setConversations((prev) => {
      const existingDraftIdx = prev.findIndex((c) => c.isDraft);
      if (existingDraftIdx !== -1) {
        setCurrentConversationIndex(existingDraftIdx);
        return prev;
      }
      // Add new conversation at the beginning (index 0) instead of the end
      const newConvo = createBlankConversation();
      const next = [newConvo, ...prev];
      setCurrentConversationIndex(0); // Set to first position
      return next;
    });
  }, []);

  // --- delete conversation ---
  const deleteConversation = useCallback(
    (id: number, opts?: { preserveIndex?: boolean }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;
        const next = prev.filter((c) => c.id !== id);
        const finalList = next.length ? next : [createBlankConversation()];
        if (!opts?.preserveIndex) setCurrentConversationIndex(0);
        return finalList;
      });
    },
    []
  );

  // --- assistant text message (coalescing) ---
  const addAssistantMessage = useCallback(
    (content: string, convId?: number) => {
      const nowIso = new Date().toISOString();
      const COALESCE_MS = 3000;
      setConversations((prev) => {
        const next = [...prev];
        const idx = findIndexById(next, convId);
        const convo = next[idx] ?? {
          ...createBlankConversation(),
          isDraft: false,
        };
        const msgs = [...(convo.messages || [])];
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
        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    [findIndexById]
  );

  // --- Append NL content to the last assistant message (always uses logbatch for consistent UI) ---
  const appendNLContent = useCallback(
    (nlContent: string, convId?: number) => {
      if (!nlContent) return;
      const nowIso = new Date().toISOString();
      setConversations((prev) => {
        const next = [...prev];
        const idx = findIndexById(next, convId);
        const convo = next[idx] ?? {
          ...createBlankConversation(),
          isDraft: false,
        };
        const msgs = [...(convo.messages || [])];
        const last = msgs[msgs.length - 1];

        // If last message is a logbatch, append to its nlSummary
        if (last && last.role === "assistant" && last.kind === "logbatch") {
          const existingNL = last.nlSummary || "";
          const newNL = existingNL ? `${existingNL}\n${nlContent}` : nlContent;
          msgs[msgs.length - 1] = {
            ...last,
            nlSummary: newNL,
            timestamp: nowIso,
          };
        }
        // Otherwise, create a new logbatch message with NL content (no logs yet)
        else {
          msgs.push({
            role: "assistant",
            kind: "logbatch",
            logLines: [], // Empty logs initially
            nlSummary: nlContent,
            content: "",
            timestamp: nowIso,
          });
        }

        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    [findIndexById]
  );

  // --- assistant log batch ---
  const addAssistantLogBatch = useCallback(
    (logLines: string[], nlSummary?: string, convId?: number) => {
      if (!Array.isArray(logLines) || !logLines.length) return;
      const nowIso = new Date().toISOString();
      setConversations((prev) => {
        const next = [...prev];
        const idx = findIndexById(next, convId);
        const convo = next[idx] ?? {
          ...createBlankConversation(),
          isDraft: false,
        };
        const msgs = [...(convo.messages || [])];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant" && last.kind === "logbatch") {
          const newLines = (last.logLines || []).concat(logLines);
          msgs[msgs.length - 1] = {
            ...last,
            logLines: newLines,
            nlSummary: nlSummary || last.nlSummary || "",
            content: newLines.join("\n"),
            timestamp: nowIso,
          };
        } else {
          msgs.push({
            role: "assistant",
            kind: "logbatch",
            logLines: [...logLines],
            nlSummary: nlSummary || "",
            content: logLines.join("\n"),
            timestamp: nowIso,
          });
        }
        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    [findIndexById]
  );

  // --- downloads & reports ---
  const downloadsPostedRef = useRef<Set<string>>(new Set());

  const addDownloadsMessage = useCallback(
    (
      jobId: string,
      entriesObject: Record<string, any> | any[],
      convId?: number
    ) => {
      if (downloadsPostedRef.current.has(jobId)) return;
      downloadsPostedRef.current.add(jobId);
      const nowIso = new Date().toISOString();
      const entries = Array.isArray(entriesObject)
        ? entriesObject
        : Object.values(entriesObject);
      setConversations((prev) => {
        const next = [...prev];
        const idx = findIndexById(next, convId);
        const convo = next[idx];
        const msgs = [...(convo.messages || [])];
        msgs.push({
          role: "assistant",
          kind: "downloads",
          jobId,
          entries,
          content: `Downloads available (${entries.length})`,
          timestamp: nowIso,
        });
        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    [findIndexById]
  );

  const addReportMessage = useCallback(
    (
      content: string,
      reportType: "deterministic" | "llm" = "deterministic",
      convId?: number
    ) => {
      const nowIso = new Date().toISOString();
      setConversations((prev) => {
        const next = [...prev];
        const idx = findIndexById(next, convId);
        const convo = next[idx];
        const msgs = [...(convo.messages || [])];
        msgs.push({
          role: "assistant",
          kind: "report",
          reportType,
          content,
          timestamp: nowIso,
        });
        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    [findIndexById]
  );

  // --- move conversation to top (most recently used) ---
  const moveConversationToTop = useCallback((id: number) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1 || idx === 0) return prev; // Already at top or not found
      
      const next = [...prev];
      const [conversation] = next.splice(idx, 1); // Remove from current position
      
      // Update lastUsedAt timestamp
      conversation.lastUsedAt = Date.now();
      
      next.unshift(conversation); // Add to beginning
      setCurrentConversationIndex(0); // Update index to 0 (top position)
      
      return next;
    });
  }, []);

  return {
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
    moveConversationToTop,
  };
}

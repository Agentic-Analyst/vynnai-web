// useConversations.ts
import { Conversation, Message } from "@/features/chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { userStorage } from "@/lib/userStorage";
import { createWelcomeMessage } from "@/pages/chat/utils";

export function useConversations(initialIndex = 0) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = userStorage.getJSON("conversations");
    if (saved) {
      return saved.map((c: any) => ({
        ...c,
        activeJobId: c.activeJobId || null,
        isStreaming: c.isStreaming || false,
        jobProgress: c.jobProgress || null,
      }));
    }
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

  // --- add message (shared primitive) ---
  const addMessage = useCallback(
    (msg: Message, convId?: number) => {
      setConversations((prev) => {
        const next = [...prev];
        const idx = findIndexById(next, convId);
        const convo = next[idx] ?? {
          id: Date.now(),
          title: "New Analysis",
          messages: [],
          activeJobId: null,
          isStreaming: false,
          jobProgress: null,
        };
        convo.messages = [
          ...(convo.messages || []),
          { ...msg, timestamp: new Date().toISOString() },
        ];
        next[idx] = convo;
        return next;
      });
    },
    [findIndexById]
  );

  // --- update conversation ---
  type Updater = (cur: Conversation) => Partial<Conversation> | Conversation;
  const updateConversation = useCallback(
    (idx: number, patchOrUpdater: Partial<Conversation> | Updater) => {
      setConversations((prev) => {
        const next = [...prev];
        const cur = next[idx];
        if (!cur) return prev;
        const patch =
          typeof patchOrUpdater === "function"
            ? (patchOrUpdater as Updater)(cur)
            : patchOrUpdater;
        next[idx] = { ...cur, ...patch };
        return next;
      });
    },
    []
  );

  // --- start new conversation ---
  const startNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: Date.now(),
      title: "New Analysis",
      messages: [createWelcomeMessage()],
      activeJobId: null,
      isStreaming: false,
      jobProgress: null,
    };
    setConversations((prev) => {
      const next = [...prev, newConversation];
      setCurrentConversationIndex(next.length - 1);
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
          id: Date.now(),
          title: "New Analysis",
          messages: [],
          activeJobId: null,
          isStreaming: false,
          jobProgress: null,
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

  // --- assistant log batch ---
  const addAssistantLogBatch = useCallback(
    (logLines: string[], nlSummary?: string, convId?: number) => {
      if (!Array.isArray(logLines) || !logLines.length) return;
      const nowIso = new Date().toISOString();
      setConversations((prev) => {
        const next = [...prev];
        const idx = findIndexById(next, convId);
        const convo = next[idx] ?? {
          id: Date.now(),
          title: "New Analysis",
          messages: [],
          activeJobId: null,
          isStreaming: false,
          jobProgress: null,
          sessionId: null,
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

  const resetDownloadsPosted = useCallback(() => {
    downloadsPostedRef.current.clear();
  }, []);

  return {
    conversations,
    currentConversationIndex,
    setCurrentConversationIndex,
    addMessage,
    updateConversation,
    startNewConversation,
    deleteConversation,
    setConversations,
    addAssistantMessage,
    addAssistantLogBatch,
    addDownloadsMessage,
    addReportMessage,
    resetDownloadsPosted,
  };
}

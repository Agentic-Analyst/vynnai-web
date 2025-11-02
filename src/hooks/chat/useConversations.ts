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

  // stable ref to avoid stale-closure issues in callbacks
  const currentConversationIndexRef = useRef<number>(currentConversationIndex);
  useEffect(() => {
    currentConversationIndexRef.current = currentConversationIndex;
  }, [currentConversationIndex]);

  /**
   * addMessage - append a message to a conversation
   * msg: Message to append (timestamp will be attached)
   * convIndex: optional explicit conversation index; defaults to currentConversationIndexRef
   */
  const addMessage = useCallback((msg: Message, convIndex?: number) => {
    setConversations((prev) => {
      const next = [...prev];
      const idx =
        typeof convIndex === "number"
          ? convIndex
          : currentConversationIndexRef.current ?? 0;

      const convo =
        next[idx] ??
        ({
          id: Date.now(),
          title: "New Analysis",
          messages: [],
          activeJobId: null,
          isStreaming: false,
          jobProgress: null,
        } as Conversation);

      convo.messages = [
        ...(convo.messages || []),
        { ...msg, timestamp: new Date().toISOString() },
      ];
      next[idx] = convo;
      return next;
    });
  }, []);

  /**
   * updateConversation - patch or compute new conversation safely
   * idx: index of conversation to update
   * patchOrUpdater: either a Partial<Conversation> patch or a function (cur => patchOrNew)
   */
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
            : (patchOrUpdater as Partial<Conversation>);
        next[idx] = { ...cur, ...patch };
        return next;
      });
    },
    []
  );

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
      // set index to the last item of the new array
      setCurrentConversationIndex(next.length - 1);
      return next;
    });
  }, []);

  /**
   * deleteConversation
   * - id: conversation id to delete
   * - opts.preserveIndex: when true the hook will NOT set currentConversationIndex;
   *   caller is expected to set index appropriately (useful when caller must run cleanup first).
   */
  const deleteConversation = useCallback(
    (id: number, opts?: { preserveIndex?: boolean }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;

        const next = prev.filter((c) => c.id !== id);

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

        // Only update the currentConversationIndex here if caller has not asked to preserve it.
        if (!opts?.preserveIndex) {
          setCurrentConversationIndex(0);
        }

        return finalList;
      });
    },
    []
  );

  /**
   * addAssistantMessage - append + coalesce assistant text segments (preserves behavior you had)
   * - content: string to append/coalesce
   * - convIndex: optional index (defaults to active conversation)
   */
  const addAssistantMessage = useCallback(
    (content: string, convIndex?: number) => {
      const idx =
        typeof convIndex === "number"
          ? convIndex
          : currentConversationIndexRef.current ?? 0;

      const COALESCE_MS = 3000;
      setConversations((prev) => {
        const next = [...prev];
        const convo =
          next[idx] ??
          ({
            id: Date.now(),
            title: "New Analysis",
            messages: [],
            activeJobId: null,
            isStreaming: false,
            jobProgress: null,
          } as Conversation);

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

        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    []
  );

  /**
   * addAssistantLogBatch - append or merge a 'logbatch' assistant message
   * - lines: string[] of new lines to append into a logbatch bubble
   * - convIndex: optional index (defaults to active conversation)
   */
  const addAssistantLogBatch = useCallback(
    (lines: string[], convIndex?: number) => {
      if (!Array.isArray(lines) || lines.length === 0) return;
      const idx =
        typeof convIndex === "number"
          ? convIndex
          : currentConversationIndexRef.current ?? 0;
      const nowIso = new Date().toISOString();

      setConversations((prev) => {
        const next = [...prev];
        const convo =
          next[idx] ??
          ({
            id: Date.now(),
            title: "New Analysis",
            messages: [],
            activeJobId: null,
            isStreaming: false,
            jobProgress: null,
          } as Conversation);

        const msgs = [...(convo.messages || [])];
        const last = msgs[msgs.length - 1];

        if (last && last.role === "assistant" && last.kind === "logbatch") {
          const newLines = (last.lines || []).concat(lines);
          msgs[msgs.length - 1] = {
            ...last,
            lines: newLines,
            content: newLines.join("\n"),
            timestamp: nowIso,
          };
        } else {
          msgs.push({
            role: "assistant",
            kind: "logbatch",
            lines: [...lines],
            nlSummary: "Summary 1", // keep or remove as you prefer
            content: lines.join("\n"),
            timestamp: nowIso,
          });
        }

        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    []
  );

  // small dedupe cache for downloads posted per jobId
  const downloadsPostedRef = useRef<Set<string>>(new Set());

  const addDownloadsMessage = useCallback(
    (
      jobId: string,
      entriesObject: Record<string, any> | any[],
      convIndex?: number
    ) => {
      const idx =
        typeof convIndex === "number"
          ? convIndex
          : currentConversationIndexRef.current ?? 0;

      // dedupe: do not post the same job twice
      if (downloadsPostedRef.current.has(jobId)) return;
      downloadsPostedRef.current.add(jobId);

      const nowIso = new Date().toISOString();
      const entries = Array.isArray(entriesObject)
        ? entriesObject
        : Object.values(entriesObject);

      setConversations((prev) => {
        const next = [...prev];
        const convo =
          next[idx] ??
          ({
            id: Date.now(),
            title: "New Analysis",
            messages: [],
            activeJobId: null,
            isStreaming: false,
            jobProgress: null,
          } as Conversation);

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
    []
  );

  const addReportMessage = useCallback(
    (
      reportContent: string,
      reportType: "deterministic" | "llm" = "deterministic",
      convIndex?: number
    ) => {
      const idx =
        typeof convIndex === "number"
          ? convIndex
          : currentConversationIndexRef.current ?? 0;

      const nowIso = new Date().toISOString();
      setConversations((prev) => {
        const next = [...prev];
        const convo =
          next[idx] ??
          ({
            id: Date.now(),
            title: "New Analysis",
            messages: [],
            activeJobId: null,
            isStreaming: false,
            jobProgress: null,
          } as Conversation);

        const msgs = [...(convo.messages || [])];
        msgs.push({
          role: "assistant",
          kind: "report",
          reportType,
          content: reportContent,
          timestamp: nowIso,
        });

        next[idx] = { ...convo, messages: msgs };
        return next;
      });
    },
    []
  );

  /**
   * utility to reset download dedupe set (e.g. on logout or import)
   */
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

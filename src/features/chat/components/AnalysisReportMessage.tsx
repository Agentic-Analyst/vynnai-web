import { LegacyRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { DETERMINISTIC_REPORT, LLM_REPORT } from "@/pages/chat/constants";
import { Message } from "..";

type AnalysisReportMessageProps = {
  measureRef: LegacyRef<HTMLDivElement>;
  message: Message;
};

const AnalysisReportMessage = ({
  measureRef,
  message,
}: AnalysisReportMessageProps) => {
  const markdownComponents = {
    h1: ({ children }) => (
      <h1
        className={`text-xl font-bold mb-3 pb-2 border-b ${
          message.reportType === "llm"
            ? "text-purple-300 border-purple-800"
            : "text-indigo-300 border-indigo-800"
        }`}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={`text-lg font-semibold mb-2 mt-4 ${
          message.reportType === "llm" ? "text-purple-200" : "text-indigo-200"
        }`}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-medium text-slate-300 mb-2 mt-3">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-slate-400 leading-relaxed mb-3">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside space-y-1 text-slate-400 mb-3">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside space-y-1 text-slate-400 mb-3">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="text-slate-400">{children}</li>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-slate-700">
        <table className="min-w-full border-collapse bg-slate-900/50">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-800/50">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-slate-800">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="border-r border-slate-700 last:border-r-0 px-3 py-2 text-left font-semibold text-slate-300">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-r border-slate-700 last:border-r-0 px-3 py-2 text-slate-400">
        {children}
      </td>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-slate-600 pl-4 italic text-slate-500 my-3">
        {children}
      </blockquote>
    ),
    br: () => <br className="my-1" />,
    code: ({ inline, className, children }) => {
      // 1. Handle inline code blocks
      if (inline) {
        return (
          <code
            className={`px-1.5 py-0.5 rounded text-sm font-mono ${
              message.reportType === "llm"
                ? "bg-purple-900/30 text-purple-300 border border-purple-800/50"
                : "bg-indigo-900/30 text-indigo-300 border border-indigo-800/50"
            }`}
          >
            {children}
          </code>
        );
      }

      // 2. Handle fenced code blocks (with syntax highlighting)
      const match = /language-(\w+)/.exec(className || "");
      if (match) {
        return (
          <SyntaxHighlighter
            language={match[1]}
            PreTag="div"
            className="border border-slate-700 rounded-md text-sm font-mono overflow-x-auto bg-slate-900/50"
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        );
      }

      // 3. Handle plain code blocks (no language specified)
      return (
        <pre className="border border-slate-700 rounded-md p-3 text-sm font-mono text-slate-400 overflow-x-auto bg-slate-900/50">
          <code>{children}</code>
        </pre>
      );
    },
  };

  return (
    <div
      ref={measureRef}
      className={`inline-block max-w-[1000px] rounded-2xl overflow-hidden shadow-lg ring-1 ${
        message.reportType === "llm"
          ? "bg-gradient-to-br from-slate-900 to-purple-950 ring-purple-900/50"
          : "bg-gradient-to-br from-slate-900 to-indigo-950 ring-indigo-900/50"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-5 py-3 border-b ${
          message.reportType === "llm"
            ? "border-purple-900/30 bg-purple-900/10"
            : "border-indigo-900/30 bg-indigo-900/10"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full shadow-sm ${
              message.reportType === "llm" ? "bg-purple-500" : "bg-indigo-500"
            }`}
          />
          <span
            className={`text-sm font-bold tracking-wide ${
              message.reportType === "llm"
                ? "text-purple-300"
                : "text-indigo-300"
            }`}
          >
            {message.reportType === "llm"
              ? LLM_REPORT.title
              : DETERMINISTIC_REPORT.title}
          </span>
        </div>
        <span
          className={`ml-auto text-xs font-medium bg-slate-900/60 px-2 py-1 rounded-full border ${
            message.reportType === "llm" ? "text-purple-400 border-purple-800/50" : "text-indigo-400 border-indigo-800/50"
          }`}
        >
          {message.reportType === "llm"
            ? LLM_REPORT.tag
            : DETERMINISTIC_REPORT.tag}
        </span>
      </div>
      <div className="p-5 bg-slate-950/50">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          className={`prose prose-sm max-w-none break-words prose-headings:font-bold prose-p:leading-relaxed prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-slate-800 ${
            message.reportType === "llm"
              ? "prose-headings:text-slate-200 prose-p:text-slate-400 prose-strong:text-purple-400 prose-code:bg-purple-900/20 prose-code:text-purple-300"
              : "prose-headings:text-slate-200 prose-p:text-slate-400 prose-strong:text-indigo-400 prose-code:bg-indigo-900/20 prose-code:text-indigo-300"
          }`}
          components={markdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      <div
        className={`px-5 py-3 border-t ${
          message.reportType === "llm"
            ? "bg-purple-900/10 border-purple-900/30"
            : "bg-indigo-900/10 border-indigo-900/30"
        }`}
      >
        <div
          className={`flex items-center justify-between text-xs ${
            message.reportType === "llm" ? "text-purple-400" : "text-indigo-400"
          }`}
        >
          <span className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                message.reportType === "llm" ? "bg-purple-500" : "bg-indigo-500"
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
  );
};

export default AnalysisReportMessage;

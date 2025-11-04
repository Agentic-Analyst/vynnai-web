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
          message.reportType === "llm" ? "text-purple-800" : "text-indigo-800"
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
      <p className="text-slate-600 leading-relaxed mb-3">{children}</p>
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
    li: ({ children }) => <li className="text-slate-600">{children}</li>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-slate-300">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
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
    code: ({ inline, className, children }) => {
      // 1. Handle inline code blocks
      if (inline) {
        return (
          <code
            className={`px-1.5 py-0.5 rounded text-sm font-mono ${
              message.reportType === "llm"
                ? "bg-purple-50 text-purple-800"
                : "bg-indigo-50 text-indigo-800"
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
            className="border border-slate-200 rounded-md text-sm font-mono overflow-x-auto"
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        );
      }

      // 3. Handle plain code blocks (no language specified)
      return (
        <pre className="border border-slate-200 rounded-md p-3 text-sm font-mono text-slate-700 overflow-x-auto">
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
              message.reportType === "llm" ? "bg-purple-500" : "bg-indigo-500"
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
              ? LLM_REPORT.title
              : DETERMINISTIC_REPORT.title}
          </span>
        </div>
        <span
          className={`ml-auto text-xs font-medium bg-white/60 px-2 py-1 rounded-full ${
            message.reportType === "llm" ? "text-purple-600" : "text-indigo-600"
          }`}
        >
          {message.reportType === "llm"
            ? LLM_REPORT.tag
            : DETERMINISTIC_REPORT.tag}
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
          components={markdownComponents}
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
            message.reportType === "llm" ? "text-purple-600" : "text-indigo-600"
          }`}
        >
          <span className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                message.reportType === "llm" ? "bg-purple-400" : "bg-indigo-400"
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

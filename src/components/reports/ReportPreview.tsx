import React, { useState } from 'react';
import { FileText, AlertCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReportPreviewProps {
  reportId: string;
  reportType: 'company' | 'sector' | 'global';
  content?: string; // Markdown content
  pdfUrl?: string; // PDF URL for iframe rendering
  loading?: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  reportId,
  reportType,
  content,
  pdfUrl,
  loading = false,
}) => {
  const [pdfError, setPdfError] = useState(false);

  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading report preview...</p>
        </div>
      </div>
    );
  }

  // If markdown content is provided, render it
  if (content) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-border">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-muted-foreground dark:text-slate-300 mb-3 leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-3 space-y-1 text-foreground">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-muted-foreground dark:text-slate-300">
                {children}
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
                {children}
              </blockquote>
            ),
            code: ({ inline, children, ...props }: any) =>
              inline ? (
                <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              ) : (
                <code className="block bg-muted text-foreground p-3 rounded-lg text-sm font-mono overflow-x-auto" {...props}>
                  {children}
                </code>
              ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 px-4 py-2 text-gray-700">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // If PDF URL is provided, render iframe
  if (pdfUrl && !pdfError) {
    return (
      <div className="h-[600px] w-full">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0 rounded-lg"
          title="Report PDF Preview"
          onError={() => setPdfError(true)}
        />
      </div>
    );
  }

  // If PDF error or no content
  if (pdfError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load PDF preview. Please try downloading the report instead.
        </AlertDescription>
      </Alert>
    );
  }

  // Placeholder if no content
  return (
    <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
      <div className="text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Report Preview</p>
        <p className="text-sm mt-2">
          Preview functionality will be available once the API integration is complete.
        </p>
      </div>
    </div>
  );
};

export default ReportPreview;

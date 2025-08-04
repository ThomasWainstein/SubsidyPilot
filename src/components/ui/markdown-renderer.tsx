import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer that preserves hierarchical structure
 * Renders headings, lists, tables, and basic formatting
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className 
}) => {
  if (!content) return null;

  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let currentListItems: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let tableRows: React.ReactNode[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];

    const flushList = () => {
      if (currentListItems.length > 0 && listType) {
        const ListComponent = listType === 'ul' ? 'ul' : 'ol';
        elements.push(
          <ListComponent key={elements.length} className="ml-4 space-y-1">
            {currentListItems}
          </ListComponent>
        );
        currentListItems = [];
        listType = null;
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  {tableHeaders.map((header, i) => (
                    <th key={i} className="border border-border px-3 py-2 text-left font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        tableHeaders = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines but preserve spacing
      if (!trimmedLine) {
        flushList();
        flushTable();
        return;
      }

      // Headers
      if (trimmedLine.startsWith('#')) {
        flushList();
        flushTable();
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const text = trimmedLine.replace(/^#+\s*/, '');
        const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        const headerClasses = {
          1: 'text-3xl font-bold mt-6 mb-4',
          2: 'text-2xl font-semibold mt-5 mb-3',
          3: 'text-xl font-semibold mt-4 mb-2',
          4: 'text-lg font-medium mt-3 mb-2',
          5: 'text-base font-medium mt-2 mb-1',
          6: 'text-sm font-medium mt-2 mb-1'
        };
        elements.push(
          <HeaderTag key={index} className={headerClasses[level as keyof typeof headerClasses]}>
            {text}
          </HeaderTag>
        );
        return;
      }

      // Table detection
      if (trimmedLine.includes('|') && !inTable) {
        flushList();
        // Check if this is a table header
        const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          tableHeaders = cells;
          inTable = true;
          return;
        }
      }

      // Table separator line (ignore)
      if (inTable && trimmedLine.match(/^\|?\s*[-:]+\s*\|/)) {
        return;
      }

      // Table rows
      if (inTable && trimmedLine.includes('|')) {
        const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          tableRows.push(
            <tr key={tableRows.length}>
              {cells.map((cell, i) => (
                <td key={i} className="border border-border px-3 py-2">
                  {formatInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          );
          return;
        }
      }

      // If we reach here and were in a table, flush it
      if (inTable) {
        flushTable();
      }

      // Bullet lists
      if (trimmedLine.match(/^[-*+]\s/)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        const text = trimmedLine.replace(/^[-*+]\s/, '');
        const indentLevel = (line.length - line.trimStart().length) / 2;
        currentListItems.push(
          <li key={currentListItems.length} className={`ml-${indentLevel * 4}`}>
            {formatInlineMarkdown(text)}
          </li>
        );
        return;
      }

      // Numbered lists
      if (trimmedLine.match(/^\d+\.\s/)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        const text = trimmedLine.replace(/^\d+\.\s/, '');
        const indentLevel = (line.length - line.trimStart().length) / 2;
        currentListItems.push(
          <li key={currentListItems.length} className={`ml-${indentLevel * 4}`}>
            {formatInlineMarkdown(text)}
          </li>
        );
        return;
      }

      // Regular paragraphs
      flushList();
      if (trimmedLine) {
        elements.push(
          <p key={index} className="mb-2 leading-relaxed">
            {formatInlineMarkdown(trimmedLine)}
          </p>
        );
      }
    });

    // Flush any remaining lists or tables
    flushList();
    flushTable();

    return elements;
  };

  const formatInlineMarkdown = (text: string): React.ReactNode => {
    // Handle bold **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Handle italic *text*
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Handle code `text`
    text = text.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
    // Handle links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>');

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      {renderMarkdown(content)}
    </div>
  );
};
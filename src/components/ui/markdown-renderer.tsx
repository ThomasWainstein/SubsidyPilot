import React from 'react';
import { cn } from '@/lib/utils';
import { createSafeHTML } from '@/utils/htmlSanitizer';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Enhanced markdown renderer with comprehensive formatting support
 * Handles headings, lists, tables, code blocks, blockquotes, and inline formatting
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
    let codeBlockContent: string[] = [];
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    let blockquoteContent: string[] = [];
    let inBlockquote = false;

    const flushList = () => {
      if (currentListItems.length > 0 && listType) {
        const ListComponent = listType === 'ul' ? 'ul' : 'ol';
        elements.push(
          <ListComponent key={elements.length} className="ml-4 space-y-1 my-3">
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
            <table className="min-w-full border-collapse border border-border rounded-lg">
              <thead>
                <tr className="bg-muted/50">
                  {tableHeaders.map((header, i) => (
                    <th key={i} className="border border-border px-4 py-3 text-left font-semibold text-sm">
                      {formatInlineMarkdown(header)}
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

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <div key={elements.length} className="my-4">
            <pre className="bg-muted/30 border border-border rounded-lg p-4 overflow-x-auto">
              <code className={`text-sm ${codeBlockLanguage ? `language-${codeBlockLanguage}` : ''}`}>
                {codeBlockContent.join('\n')}
              </code>
            </pre>
          </div>
        );
        codeBlockContent = [];
        codeBlockLanguage = '';
        inCodeBlock = false;
      }
    };

    const flushBlockquote = () => {
      if (blockquoteContent.length > 0) {
        elements.push(
          <blockquote key={elements.length} className="border-l-4 border-primary/30 bg-muted/20 pl-4 py-2 my-4 italic">
            {blockquoteContent.map((line, i) => (
              <p key={i} className="mb-1 last:mb-0">
                {formatInlineMarkdown(line)}
              </p>
            ))}
          </blockquote>
        );
        blockquoteContent = [];
        inBlockquote = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          flushList();
          flushTable();
          flushBlockquote();
          inCodeBlock = true;
          codeBlockLanguage = trimmedLine.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Handle blockquotes
      if (trimmedLine.startsWith('>')) {
        if (!inBlockquote) {
          flushList();
          flushTable();
          inBlockquote = true;
        }
        const quoteLine = trimmedLine.slice(1).trim();
        if (quoteLine) {
          blockquoteContent.push(quoteLine);
        }
        return;
      } else if (inBlockquote) {
        flushBlockquote();
      }
      
      // Skip empty lines but preserve spacing
      if (!trimmedLine) {
        flushList();
        flushTable();
        flushBlockquote();
        return;
      }

      // Headers
      if (trimmedLine.startsWith('#')) {
        flushList();
        flushTable();
        flushBlockquote();
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const text = trimmedLine.replace(/^#+\s*/, '');
        const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        const headerClasses = {
          1: 'text-3xl font-bold mt-8 mb-4 text-foreground border-b border-border pb-2',
          2: 'text-2xl font-semibold mt-6 mb-3 text-foreground',
          3: 'text-xl font-semibold mt-5 mb-3 text-foreground',
          4: 'text-lg font-medium mt-4 mb-2 text-foreground',
          5: 'text-base font-medium mt-3 mb-2 text-foreground',
          6: 'text-sm font-medium mt-2 mb-1 text-muted-foreground'
        };
        elements.push(
          <HeaderTag key={index} className={headerClasses[level as keyof typeof headerClasses]}>
            {formatInlineMarkdown(text)}
          </HeaderTag>
        );
        return;
      }

      // Horizontal rules
      if (trimmedLine.match(/^[-*_]{3,}$/)) {
        flushList();
        flushTable();
        flushBlockquote();
        elements.push(
          <hr key={index} className="my-6 border-border" />
        );
        return;
      }

      // Table detection
      if (trimmedLine.includes('|') && !inTable) {
        flushList();
        flushBlockquote();
        // Check if this is a table header
        const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          tableHeaders = cells;
          inTable = true;
          return;
        }
      }

      // Table separator line (ignore)
      if (inTable && trimmedLine.match(/^\|?\s*[-:]+\s*(\|[-:]+\s*)*\|?\s*$/)) {
        return;
      }

      // Table rows
      if (inTable && trimmedLine.includes('|')) {
        const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          tableRows.push(
            <tr key={tableRows.length} className="hover:bg-muted/20">
              {cells.map((cell, i) => (
                <td key={i} className="border border-border px-4 py-3 text-sm">
                  {formatInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          );
          return;
        }
      }

      // If we reach here and were in a table, flush it
      if (inTable && !trimmedLine.includes('|')) {
        flushTable();
      }

      // Bullet lists (including nested)
      const bulletMatch = trimmedLine.match(/^(\s*)([-*+])\s(.+)$/);
      if (bulletMatch) {
        const [, indent, , text] = bulletMatch;
        const indentLevel = Math.floor(indent.length / 2);
        
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        
        currentListItems.push(
          <li key={currentListItems.length} className={`${indentLevel > 0 ? `ml-${indentLevel * 4}` : ''} mb-1`}>
            {formatInlineMarkdown(text)}
          </li>
        );
        return;
      }

      // Numbered lists (including nested)
      const numberedMatch = trimmedLine.match(/^(\s*)(\d+)\.\s(.+)$/);
      if (numberedMatch) {
        const [, indent, , text] = numberedMatch;
        const indentLevel = Math.floor(indent.length / 2);
        
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        
        currentListItems.push(
          <li key={currentListItems.length} className={`${indentLevel > 0 ? `ml-${indentLevel * 4}` : ''} mb-1`}>
            {formatInlineMarkdown(text)}
          </li>
        );
        return;
      }

      // Regular paragraphs
      flushList();
      if (trimmedLine) {
        elements.push(
          <p key={index} className="mb-3 leading-relaxed text-foreground">
            {formatInlineMarkdown(trimmedLine)}
          </p>
        );
      }
    });

    // Flush any remaining content
    flushList();
    flushTable();
    flushCodeBlock();
    flushBlockquote();

    return elements;
  };

  const formatInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return '';

    // Create a unique key for React elements
    const createKey = () => Math.random().toString(36).substr(2, 9);

    // Handle bold **text** and __text__
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong class="font-semibold">$2</strong>');
    
    // Handle italic *text* and _text_ (but not within words)
    text = text.replace(/(?<!\w)(\*|_)(.*?)\1(?!\w)/g, '<em class="italic">$2</em>');
    
    // Handle strikethrough ~~text~~
    text = text.replace(/~~(.*?)~~/g, '<del class="line-through opacity-75">$1</del>');
    
    // Handle inline code `text`
    text = text.replace(/`([^`]+)`/g, '<code class="bg-muted/60 border border-border px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Handle links [text](url) and [text](url "title")
    text = text.replace(/\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g, 
      '<a href="$2" class="text-primary underline decoration-1 underline-offset-2 hover:text-primary/80 hover:decoration-2 transition-all" target="_blank" rel="noopener noreferrer" title="$3">$1</a>');
    
    // Handle autolinks <url>
    text = text.replace(/<(https?:\/\/[^>]+)>/g, 
      '<a href="$1" class="text-primary underline decoration-1 underline-offset-2 hover:text-primary/80 hover:decoration-2 transition-all" target="_blank" rel="noopener noreferrer">$1</a>');

    return <span dangerouslySetInnerHTML={createSafeHTML(text)} />;
  };

  return (
    <div className={cn(
      'prose prose-sm max-w-none',
      'prose-headings:text-foreground prose-p:text-foreground',
      'prose-strong:text-foreground prose-em:text-foreground',
      'prose-code:text-foreground prose-pre:bg-muted/30',
      'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
      'prose-blockquote:border-l-primary/30 prose-blockquote:bg-muted/20',
      'prose-th:text-foreground prose-td:text-foreground',
      className
    )}>
      {renderMarkdown(content)}
    </div>
  );
};

/**
 * Format Preserver - Maintains original formatting and structure
 */

import { ContentBlock, SourceReference, HarvestConfig, TableData, ListData, HeadingData } from '../types/scraper.types';

export class FormatPreserver {
  private config: HarvestConfig;

  constructor(config: HarvestConfig) {
    this.config = config;
  }

  /**
   * Create heading block from HTML element
   */
  async createHeadingBlock(
    blockId: string,
    element: Element,
    sourceRef: SourceReference
  ): Promise<ContentBlock> {
    const level = parseInt(element.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.
    const text = this.extractTextContent(element);
    
    return {
      id: blockId,
      type: 'heading',
      verbatim: true,
      html_content: element.outerHTML,
      markdown_content: `${'#'.repeat(level)} ${text}`,
      plain_text: text,
      heading_level: level,
      heading_text: text,
      source_ref: sourceRef
    };
  }

  /**
   * Create table block from HTML element
   */
  async createTableBlock(
    blockId: string,
    element: Element,
    sourceRef: SourceReference
  ): Promise<ContentBlock> {
    const tableData = this.extractTableData(element);
    
    return {
      id: blockId,
      type: 'table',
      verbatim: true,
      html_content: element.outerHTML,
      markdown_content: this.tableToMarkdown(tableData),
      plain_text: this.tableToPlainText(tableData),
      table_columns: tableData.columns,
      table_rows: tableData.rows,
      table_caption: tableData.caption,
      source_ref: sourceRef
    };
  }

  /**
   * Create list block from HTML element
   */
  async createListBlock(
    blockId: string,
    element: Element,
    sourceRef: SourceReference
  ): Promise<ContentBlock> {
    const listData = this.extractListData(element);
    
    return {
      id: blockId,
      type: 'list',
      verbatim: true,
      html_content: element.outerHTML,
      markdown_content: this.listToMarkdown(listData),
      plain_text: this.listToPlainText(listData),
      list_ordered: listData.ordered,
      list_items: listData.items,
      source_ref: sourceRef
    };
  }

  /**
   * Create paragraph block from HTML element
   */
  async createParagraphBlock(
    blockId: string,
    element: Element,
    sourceRef: SourceReference
  ): Promise<ContentBlock> {
    const text = this.extractTextContent(element);
    
    return {
      id: blockId,
      type: 'paragraph',
      verbatim: true,
      html_content: element.outerHTML,
      markdown_content: text,
      plain_text: text,
      source_ref: sourceRef
    };
  }

  /**
   * Extract table structure preserving all data
   */
  private extractTableData(table: Element): TableData {
    const columns: string[] = [];
    const rows: any[][] = [];
    let caption: string | undefined;

    // Extract caption
    const captionEl = table.querySelector('caption');
    if (captionEl) {
      caption = this.extractTextContent(captionEl);
    }

    // Extract headers
    const headerRows = Array.from(table.querySelectorAll('thead tr, tr:first-child'));
    if (headerRows.length > 0) {
      const headerCells = Array.from(headerRows[0].querySelectorAll('th, td'));
      columns.push(...headerCells.map(cell => this.extractTextContent(cell)));
    }

    // Extract data rows
    const bodyRows = Array.from(table.querySelectorAll('tbody tr, tr:not(:first-child)'));
    for (const row of bodyRows) {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const rowData = cells.map(cell => this.extractTextContent(cell));
      if (rowData.some(cell => cell.trim())) { // Only add non-empty rows
        rows.push(rowData);
      }
    }

    // If no headers were found but we have data, use generic column names
    if (columns.length === 0 && rows.length > 0) {
      const colCount = Math.max(...rows.map(row => row.length));
      for (let i = 0; i < colCount; i++) {
        columns.push(`Column ${i + 1}`);
      }
    }

    return { columns, rows, caption };
  }

  /**
   * Extract list structure preserving order and items
   */
  private extractListData(list: Element): ListData {
    const ordered = list.tagName.toLowerCase() === 'ol';
    const items: string[] = [];

    const listItems = Array.from(list.querySelectorAll('li'));
    for (const item of listItems) {
      const text = this.extractTextContent(item);
      if (text.trim()) {
        items.push(text);
      }
    }

    return { ordered, items };
  }

  /**
   * Convert table to markdown format
   */
  private tableToMarkdown(tableData: TableData): string {
    if (tableData.columns.length === 0 || tableData.rows.length === 0) {
      return '';
    }

    let markdown = '';
    
    if (tableData.caption) {
      markdown += `*${tableData.caption}*\n\n`;
    }

    // Header row
    markdown += `| ${tableData.columns.join(' | ')} |\n`;
    
    // Separator row
    markdown += `| ${tableData.columns.map(() => '---').join(' | ')} |\n`;
    
    // Data rows
    for (const row of tableData.rows) {
      const paddedRow = [...row];
      // Pad row to match column count
      while (paddedRow.length < tableData.columns.length) {
        paddedRow.push('');
      }
      markdown += `| ${paddedRow.join(' | ')} |\n`;
    }

    return markdown;
  }

  /**
   * Convert table to plain text
   */
  private tableToPlainText(tableData: TableData): string {
    let text = '';
    
    if (tableData.caption) {
      text += `${tableData.caption}\n\n`;
    }

    if (tableData.columns.length > 0) {
      text += tableData.columns.join(' | ') + '\n';
    }

    for (const row of tableData.rows) {
      text += row.join(' | ') + '\n';
    }

    return text;
  }

  /**
   * Convert list to markdown format
   */
  private listToMarkdown(listData: ListData): string {
    return listData.items
      .map((item, index) => {
        const prefix = listData.ordered ? `${index + 1}.` : '-';
        return `${prefix} ${item}`;
      })
      .join('\n');
  }

  /**
   * Convert list to plain text
   */
  private listToPlainText(listData: ListData): string {
    return listData.items.join('\n');
  }

  /**
   * Extract clean text content from element
   */
  private extractTextContent(element: Element): string {
    if (!element) return '';
    
    // Clone to avoid modifying original
    const clone = element.cloneNode(true) as Element;
    
    // Remove script and style elements
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    
    // Get text content and normalize whitespace
    const text = clone.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Preserve original HTML attributes that may contain styling info
   */
  private preserveAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      // Preserve class and style attributes for potential formatting reconstruction
      if (['class', 'style', 'id'].includes(attr.name)) {
        attributes[attr.name] = attr.value;
      }
    }
    
    return attributes;
  }
}
import React from 'react';

/**
 * Parses inline markdown:
 * - ***bold-italic***
 * - **bold**
 * - *italic*
 */
export function formatInlineMarkdown(text: string, strongClass?: string): React.ReactNode {
  if (!text) return text;

  // Regex to match ***...***, **...**, or *...*
  const regex = /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('***') && token.endsWith('***')) {
      const inner = token.slice(3, -3);
      parts.push(
        <strong key={`bi-${match.index}`} className={`font-bold italic ${strongClass || ''}`}>
          {inner}
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2);
      parts.push(
        <strong key={`b-${match.index}`} className={`font-bold ${strongClass || ''}`}>
          {inner}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const inner = token.slice(1, -1);
      parts.push(
        <em key={`i-${match.index}`} className="italic">
          {inner}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
  return parts;
}

/**
 * Formats a book paragraph string, properly rendering markdown bold (**...**),
 * italics (*...*), and preserved line breaks (\n) exactly as laid out in the PDF.
 */
export function formatBookText(text: string, strongClass?: string): React.ReactNode {
  if (!text) return text;

  // Split by newline characters to retain line breaks from the PDF
  const lines = text.split('\n');
  if (lines.length > 1) {
    return lines.map((line, lIdx) => (
      <React.Fragment key={lIdx}>
        {formatInlineMarkdown(line, strongClass)}
        {lIdx < lines.length - 1 && <br className="select-none" />}
      </React.Fragment>
    ));
  }

  return formatInlineMarkdown(text, strongClass);
}

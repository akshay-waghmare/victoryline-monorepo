import { Pipe, PipeTransform } from '@angular/core';

/**
 * Markdown Pipe
 * 
 * Transforms markdown text to basic HTML (simplified for TypeScript 3.2 compatibility).
 * 
 * Usage: {{ markdownContent | markdown }}
 */
@Pipe({
  name: 'markdown'
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    try {
      // Basic markdown-like transformations
      // Strip any potentially dangerous tags first
      let html = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        // Convert headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Convert bold and italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Convert line breaks
        .replace(/\n/g, '<br>');

      return html;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return value;
    }
  }
}

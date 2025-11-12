import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import * as DOMPurify from 'dompurify';

/**
 * Markdown Pipe
 * 
 * Transforms markdown text to sanitized HTML.
 * Uses marked library for markdown parsing and DOMPurify for XSS protection.
 * 
 * Usage: {{ markdownContent | markdown }}
 */
@Pipe({
  name: 'markdown'
})
export class MarkdownPipe implements PipeTransform {
  constructor() {
    // Configure marked options
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert \n to <br>
      headerIds: true, // Add IDs to headers
      mangle: false, // Don't escape email addresses
      pedantic: false,
      sanitize: false, // We handle sanitization with DOMPurify
      smartLists: true,
      smartypants: true // Use "smart" typographic punctuation
    });
  }

  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    try {
      // Parse markdown to HTML
      const html = marked.parse(value) as string;

      // Sanitize HTML to prevent XSS attacks
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 's', 'del',
          'a', 'img',
          'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr', 'div', 'span'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'target', 'rel',
          'src', 'alt', 'width', 'height',
          'class', 'id',
          'style' // Allow inline styles for better markdown compatibility
        ],
        ALLOW_DATA_ATTR: false,
        ADD_ATTR: ['target'], // Allow target attribute for links
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
        FORBID_ATTR: ['onclick', 'onerror', 'onload']
      });

      return sanitized;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return value; // Return original text if parsing fails
    }
  }
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownPipe } from './pipes/markdown.pipe';

/**
 * Shared Module
 * 
 * Contains shared components, pipes, and directives used across
 * multiple feature modules.
 */
@NgModule({
  declarations: [
    MarkdownPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    MarkdownPipe
  ]
})
export class SharedModule { }

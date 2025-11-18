import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

@Component({
  selector: 'app-tab-nav',
  templateUrl: './tab-nav.component.html',
  styleUrls: ['./tab-nav.component.css']
})
export class TabNavComponent {
  @Input() tabs: Tab[] = [];
  @Input() activeTabId: string = '';
  @Output() tabChange = new EventEmitter<string>();

  selectTab(tabId: string): void {
    if (tabId !== this.activeTabId) {
      this.activeTabId = tabId;
      this.tabChange.emit(tabId);
    }
  }

  isActive(tabId: string): boolean {
    return this.activeTabId === tabId;
  }

  getIndicatorTransform(): string {
    const index = this.tabs.findIndex(t => t.id === this.activeTabId);
    return `translateX(${index * 100}%)`;
  }

  /**
   * Keyboard navigation for tabs (T023)
   * Arrow Left/Right to switch tabs
   */
  @HostListener('keydown', ['$event'])
  handleKeyboardNavigation(event: KeyboardEvent): void {
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    
    if (event.key === 'ArrowLeft' || event.key === 'Left') {
      event.preventDefault();
      const previousIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
      this.selectTab(this.tabs[previousIndex].id);
    } else if (event.key === 'ArrowRight' || event.key === 'Right') {
      event.preventDefault();
      const nextIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
      this.selectTab(this.tabs[nextIndex].id);
    }
  }
}

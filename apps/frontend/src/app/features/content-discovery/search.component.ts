import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DiscoveryFilterService } from './discovery-filter.service';
import { MatchCardViewModel } from '../matches/models/match-card.models';

@Component({
  selector: 'app-search',
  template: `
    <div class="search-container">
      <input 
        type="search" 
        placeholder="Search teams, matches, or players" 
        [(ngModel)]="query"
        (input)="onInput($event.target.value)"
        (focus)="showSuggestions = true"
        (blur)="onBlur()"
        aria-label="Search"
        aria-autocomplete="list"
        aria-controls="suggestions-list"
        [attr.aria-expanded]="showSuggestions && suggestions.length > 0"
      />
      <ul 
        id="suggestions-list"
        *ngIf="showSuggestions && suggestions.length > 0" 
        class="suggestions"
        role="listbox"
      >
        <li 
          *ngFor="let s of suggestions; let i = index" 
          (mousedown)="selectSuggestion(s)"
          class="suggestion-item"
          role="option"
          [attr.aria-selected]="selectedIndex === i"
          tabindex="-1"
        >
          <div class="suggestion-content">
            <span class="suggestion-title">{{s.team1 && s.team1.name}} vs {{s.team2 && s.team2.name}}</span>
            <span class="suggestion-meta">{{s.venue}} • {{s.displayStatus}}</span>
          </div>
        </li>
      </ul>
      <div *ngIf="loading" class="search-loading">Searching...</div>
    </div>
  `,
  styles: [`
    .search-container {
      position: relative;
      width: 100%;
    }
    .search-container input[type="search"] {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #ddd;
      font-size: 1rem;
    }
    .search-container input:focus {
      outline: 2px solid var(--primary-color, #1976d2);
      border-color: transparent;
    }
    .suggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
    }
    .suggestion-item {
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f0f0f0;
    }
    .suggestion-item:last-child {
      border-bottom: none;
    }
    .suggestion-item:hover,
    .suggestion-item[aria-selected="true"] {
      background: #f5f5f5;
    }
    .suggestion-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    .suggestion-title {
      font-weight: 500;
      color: #333;
    }
    .suggestion-meta {
      font-size: 0.85rem;
      color: #666;
    }
    .search-loading {
      position: absolute;
      top: calc(100% + 4px);
      right: 12px;
      font-size: 0.85rem;
      color: #999;
    }
  `]
})
export class SearchComponent implements OnDestroy {
  @Output() search = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<MatchCardViewModel>();

  query = '';
  suggestions: MatchCardViewModel[] = [];
  showSuggestions = false;
  loading = false;
  selectedIndex = -1;

  private searchSubject = new Subject<string>();
  private subscription: Subscription;

  constructor(private discoveryService: DiscoveryFilterService) {
    // Debounce search input by 300ms, only emit distinct values
    this.subscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.length < 2) {
          this.suggestions = [];
          this.loading = false;
          return [];
        }
        this.loading = true;
        return this.discoveryService.searchWithSuggestions(q);
      })
    ).subscribe(results => {
      this.suggestions = results;
      this.loading = false;
      this.showSuggestions = true;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  onInput(value: string) {
    this.query = value;
    this.searchSubject.next(value);
  }

  selectSuggestion(item: MatchCardViewModel) {
    this.query = `${item.team1 && item.team1.name || ''} vs ${item.team2 && item.team2.name || ''}`;
    this.showSuggestions = false;
    this.suggestionSelected.emit(item);
    this.search.emit(this.query);
  }

  onBlur() {
    // Delay hiding to allow click events on suggestions
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }
}

# Component Contract: Player Chart

**Component Name**: `PlayerChartComponent`  
**Selector**: `app-player-chart`  
**Purpose**: Visualize player statistics using Chart.js  
**Created**: 2025-11-06

---

## Component Interface

### Inputs

```typescript
/**
 * Chart type
 * @required
 */
@Input() chartType!: 'line' | 'bar' | 'radar' | 'doughnut';

/**
 * Chart data
 * @required
 */
@Input() chartData!: ChartData;

/**
 * Chart title
 * @optional
 */
@Input() title?: string;

/**
 * Chart height in pixels
 * @optional
 * @default 300
 */
@Input() height: number = 300;

/**
 * Enable animations
 * @optional
 * @default true
 */
@Input() enableAnimations: boolean = true;

/**
 * Custom chart options (merged with defaults)
 * @optional
 */
@Input() customOptions?: Partial<ChartOptions>;

/**
 * Show legend
 * @optional
 * @default true
 */
@Input() showLegend: boolean = true;

/**
 * Legend position
 * @optional
 * @default 'top'
 */
@Input() legendPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';
```

### Outputs

```typescript
/**
 * Emitted when user clicks on a data point
 */
@Output() dataPointClick = new EventEmitter<DataPointClickEvent>();

/**
 * Emitted when chart finishes rendering
 */
@Output() chartReady = new EventEmitter<Chart>();

/**
 * Emitted when chart updates (e.g., data changes)
 */
@Output() chartUpdated = new EventEmitter<Chart>();
```

### Event Interfaces

```typescript
/**
 * Data point click event
 */
export interface DataPointClickEvent {
  datasetIndex: number;
  dataIndex: number;
  label: string;
  value: number;
  event: MouseEvent;
}
```

---

## Public Methods

```typescript
/**
 * Update chart data programmatically
 * @param newData New chart data
 */
public updateData(newData: ChartData): void;

/**
 * Update chart options
 * @param newOptions New chart options (partial)
 */
public updateOptions(newOptions: Partial<ChartOptions>): void;

/**
 * Refresh/re-render chart
 */
public refresh(): void;

/**
 * Export chart as image
 * @param format Image format (default: 'png')
 * @returns Data URL of chart image
 */
public exportAsImage(format?: 'png' | 'jpeg'): string;

/**
 * Destroy chart instance (cleanup)
 */
public destroyChart(): void;
```

---

## Component State

```typescript
/**
 * Internal component state
 */
interface PlayerChartState {
  // Chart.js instance
  chartInstance: Chart | null;
  
  // Canvas context
  canvasContext: CanvasRenderingContext2D | null;
  
  // Current theme colors
  themeColors: ThemeColors;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
}
```

---

## Template Structure

```html
<div class="player-chart"
     [class.is-loading]="isLoading"
     [class.has-error]="error">
  
  <!-- Chart Title -->
  <h3 class="player-chart__title" *ngIf="title">
    {{ title }}
  </h3>
  
  <!-- Canvas -->
  <div class="player-chart__container"
       [style.height.px]="height">
    <canvas #chartCanvas
            [attr.aria-label]="getChartAriaLabel()">
    </canvas>
  </div>
  
  <!-- Loading State -->
  <div class="player-chart__loading" *ngIf="isLoading">
    <mat-spinner diameter="40"></mat-spinner>
    <p>Loading chart...</p>
  </div>
  
  <!-- Error State -->
  <div class="player-chart__error" *ngIf="error">
    <mat-icon>error_outline</mat-icon>
    <p>{{ error }}</p>
    <button mat-button (click)="refresh()">Retry</button>
  </div>
  
  <!-- Accessibility: Data Table -->
  <table class="player-chart__data-table sr-only"
         *ngIf="chartData">
    <caption>{{ getChartAriaLabel() }}</caption>
    <thead>
      <tr>
        <th>Label</th>
        <th *ngFor="let dataset of chartData.datasets">
          {{ dataset.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let label of chartData.labels; let i = index">
        <td>{{ label }}</td>
        <td *ngFor="let dataset of chartData.datasets">
          {{ dataset.data[i] }}
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Chart Configuration

### Default Options by Chart Type

```typescript
/**
 * Get default options for chart type
 */
private getDefaultOptions(type: ChartType): ChartOptions {
  const baseOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: this.showLegend,
        position: this.legendPosition
      },
      tooltip: {
        enabled: true,
        backgroundColor: this.themeColors.backgroundElevated,
        titleColor: this.themeColors.textPrimary,
        bodyColor: this.themeColors.textSecondary,
        borderColor: this.themeColors.border,
        borderWidth: 1
      }
    },
    onClick: (event, elements) => this.handleChartClick(event, elements)
  };
  
  switch (type) {
    case 'line':
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: this.themeColors.border
            },
            ticks: {
              color: this.themeColors.textSecondary
            }
          },
          x: {
            grid: {
              color: this.themeColors.border
            },
            ticks: {
              color: this.themeColors.textSecondary
            }
          }
        },
        elements: {
          line: {
            tension: 0.4 // Smooth lines
          }
        }
      };
      
    case 'bar':
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: this.themeColors.border
            },
            ticks: {
              color: this.themeColors.textSecondary
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: this.themeColors.textSecondary
            }
          }
        }
      };
      
    case 'radar':
      return {
        ...baseOptions,
        scales: {
          r: {
            beginAtZero: true,
            grid: {
              color: this.themeColors.border
            },
            pointLabels: {
              color: this.themeColors.textPrimary
            },
            ticks: {
              color: this.themeColors.textSecondary
            }
          }
        }
      };
      
    case 'doughnut':
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            display: this.showLegend,
            position: this.legendPosition,
            labels: {
              color: this.themeColors.textPrimary
            }
          }
        }
      };
      
    default:
      return baseOptions;
  }
}
```

### Theme-Aware Color Generation

```typescript
/**
 * Generate chart colors based on current theme
 */
private generateChartColors(count: number): string[] {
  const baseColors = [
    this.themeColors.primary,
    this.themeColors.success,
    this.themeColors.warning,
    this.themeColors.info,
    this.themeColors.error
  ];
  
  // If we need more colors, generate variations
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  const colors: string[] = [...baseColors];
  while (colors.length < count) {
    // Generate lighter/darker variations
    const baseColor = baseColors[colors.length % baseColors.length];
    const variation = this.adjustColorBrightness(baseColor, (colors.length % 2 === 0) ? 20 : -20);
    colors.push(variation);
  }
  
  return colors;
}

/**
 * Adjust color brightness (simple implementation)
 */
private adjustColorBrightness(color: string, percent: number): string {
  // Convert hex to RGB
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
```

---

## Lifecycle Behavior

### OnInit
1. Subscribe to `ThemeService` to get current theme colors
2. Wait for `chartData` input (required)
3. Validate inputs (chartType, chartData)

### AfterViewInit
1. Get canvas element via `ViewChild`
2. Get canvas 2D context
3. Create Chart.js instance with configuration
4. Emit `chartReady` event

### OnChanges
1. Detect changes in `chartData` or `chartType`
2. If `chartData` changed, call `updateData()`
3. If `chartType` changed, recreate chart
4. If `customOptions` changed, call `updateOptions()`

### OnDestroy
1. Destroy Chart.js instance
2. Unsubscribe from theme service
3. Clear canvas context

---

## Chart Creation

```typescript
private createChart(): void {
  if (!this.canvasContext) {
    console.error('Canvas context not available');
    return;
  }
  
  // Destroy existing chart
  if (this.chartInstance) {
    this.chartInstance.destroy();
  }
  
  try {
    // Prepare data with theme colors
    const preparedData = this.prepareChartData();
    
    // Merge options
    const options = this.mergeOptions();
    
    // Create chart
    this.chartInstance = new Chart(this.canvasContext, {
      type: this.chartType,
      data: preparedData,
      options: options
    });
    
    this.isLoading = false;
    this.error = null;
    this.chartReady.emit(this.chartInstance);
  } catch (error) {
    console.error('Failed to create chart:', error);
    this.error = 'Failed to create chart';
    this.isLoading = false;
  }
}

private prepareChartData(): ChartData {
  const data = { ...this.chartData };
  
  // Apply theme colors to datasets if not specified
  const colors = this.generateChartColors(data.datasets.length);
  
  data.datasets = data.datasets.map((dataset, index) => ({
    ...dataset,
    backgroundColor: dataset.backgroundColor || colors[index],
    borderColor: dataset.borderColor || colors[index],
    borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 2
  }));
  
  return data;
}

private mergeOptions(): ChartOptions {
  const defaultOptions = this.getDefaultOptions(this.chartType);
  
  // Disable animations if requested or if reduced motion preferred
  if (!this.enableAnimations || this.prefersReducedMotion()) {
    defaultOptions.animation = false;
  }
  
  // Merge with custom options
  return this.deepMerge(defaultOptions, this.customOptions || {});
}
```

---

## Data Point Click Handling

```typescript
private handleChartClick(event: MouseEvent, elements: any[]): void {
  if (elements.length === 0) return;
  
  const firstElement = elements[0];
  const datasetIndex = firstElement.datasetIndex;
  const dataIndex = firstElement.index;
  
  const label = this.chartData.labels[dataIndex];
  const dataset = this.chartData.datasets[datasetIndex];
  const value = dataset.data[dataIndex] as number;
  
  this.dataPointClick.emit({
    datasetIndex,
    dataIndex,
    label,
    value,
    event
  });
}
```

---

## Accessibility

### ARIA Labels

```typescript
private getChartAriaLabel(): string {
  const typeLabel = this.chartType.charAt(0).toUpperCase() + this.chartType.slice(1);
  const titleLabel = this.title ? ` - ${this.title}` : '';
  return `${typeLabel} chart${titleLabel}`;
}
```

### Screen Reader Support
- Canvas has `aria-label` describing chart type and title
- Hidden data table provides chart data in accessible format
- Loading/error states announced via `aria-live` regions

---

## Styling Contract

```scss
.player-chart {
  // Container
  --chart-padding: var(--spacing-md);
  --chart-background: var(--color-background-elevated);
  --chart-border: 1px solid var(--color-border);
  --chart-border-radius: var(--border-radius-lg);
  
  background: var(--chart-background);
  border: var(--chart-border);
  border-radius: var(--chart-border-radius);
  padding: var(--chart-padding);
  
  // Title
  &__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-md);
  }
  
  // Canvas container
  &__container {
    position: relative;
    width: 100%;
  }
  
  // Loading state
  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl);
  }
  
  // Error state
  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl);
    color: var(--color-error);
  }
  
  // Screen reader only table
  &__data-table.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}
```

---

## Testing Contract

### Unit Tests Required
1. **Chart creation**
   - Chart instance created on AfterViewInit
   - Chart type applied correctly
   - Theme colors applied to chart
   
2. **Data updates**
   - `updateData()` updates chart
   - Chart re-renders with new data
   
3. **Options updates**
   - `updateOptions()` applies new options
   - Custom options merged with defaults
   
4. **Click handling**
   - `dataPointClick` emits correct data
   - Event includes datasetIndex, dataIndex, label, value
   
5. **Accessibility**
   - Canvas has aria-label
   - Data table contains chart data
   - Loading/error states announced

---

## Dependencies

### Required Services
- `ThemeService`: Get current theme colors

### Required Libraries
- `chart.js`: Charting library
- `@angular/material`: Loading spinner, icons, buttons

---

## Usage Examples

### Line Chart (Batting Form)
```html
<app-player-chart
  [chartType]="'line'"
  [chartData]="battingFormData"
  [title]="'Recent Batting Form'"
  [height]="300"
  (dataPointClick)="showMatchDetails($event)">
</app-player-chart>
```

### Bar Chart (Strike Rate Comparison)
```html
<app-player-chart
  [chartType]="'bar'"
  [chartData]="strikeRateData"
  [title]="'Strike Rate vs Opponents'"
  [showLegend]="false">
</app-player-chart>
```

### Radar Chart (All-Round Performance)
```html
<app-player-chart
  [chartType]="'radar'"
  [chartData]="allRoundData"
  [title]="'Player Skills'"
  [legendPosition]="'bottom'">
</app-player-chart>
```

---

## Version History

- **v1.0.0** (2025-11-06): Initial contract definition

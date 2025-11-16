import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, HostBinding, Input } from '@angular/core';
import { HeroPodFooterDirective } from './hero-pod-footer.directive';

type HeroPodTone = 'default' | 'accent' | 'warning' | 'error';

let uniqueId = 0;

@Component({
  selector: 'app-hero-pod',
  templateUrl: './hero-pod.component.html',
  styleUrls: ['./hero-pod.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroPodComponent implements AfterContentInit {
  @Input() title = '';
  @Input() subtitle: string | null = null;
  @Input() statusBadge: string | null = null;
  @Input() tone: HeroPodTone = 'default';
  @Input() compact = false;

  @ContentChild(HeroPodFooterDirective) private footer?: HeroPodFooterDirective | null;

  footerVisible = false;
  headerId = `hero-pod-header-${++uniqueId}`;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  @HostBinding('class.hero-pod')
  hostClass = true;

  @HostBinding('class.hero-pod--compact')
  get compactClass(): boolean {
    return this.compact;
  }

  @HostBinding('class.hero-pod--accent')
  get accentClass(): boolean {
    return this.tone === 'accent';
  }

  @HostBinding('class.hero-pod--warning')
  get warningClass(): boolean {
    return this.tone === 'warning';
  }

  @HostBinding('class.hero-pod--error')
  get errorClass(): boolean {
    return this.tone === 'error';
  }

  @HostBinding('attr.role')
  role = 'group';

  @HostBinding('attr.aria-labelledby')
  get labelledBy(): string | null {
    return this.title ? this.headerId : null;
  }

  @HostBinding('attr.data-tone')
  get toneData(): string {
    return this.tone;
  }

  ngAfterContentInit(): void {
    this.footerVisible = !!this.footer;
    this.cdr.markForCheck();
  }
}

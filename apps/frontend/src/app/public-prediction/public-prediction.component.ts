import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { AnalyticsService } from '../cricket-odds/analytics.service';
import {
  MatchIntelligenceDataService,
  PublicPredictionHistoryRecord,
  PublicPredictionHistorySummary,
  PublicPredictionMatch
} from '../features/match-intelligence/match-intelligence-data.service';
import { MetaTagsService } from '../seo/meta-tags.service';
import { StructuredDataService } from '../seo/structured-data.service';
import { PublicPredictionHostService } from './public-prediction-host.service';

type PublicPredictionPage =
  'home' | 'how-it-works' | 'history' | 'creator-packs' | 'partners'
  | 'media-kit' | 'developers' | 'share' | 'embed' | 'history-detail';

interface CreatorPackSample {
  title: string;
  competition: string;
  snapshotLabel: string;
  summary: string;
  sharePath: string;
  embedPath: string;
  canonicalPath: string;
  manifestPath: string;
  artifacts: CreatorPackArtifact[];
}

interface CreatorPackArtifact {
  label: string;
  path: string;
  downloadName: string;
}

@Component({
  selector: 'app-public-prediction',
  templateUrl: './public-prediction.component.html',
  styleUrls: ['./public-prediction.component.css']
})
export class PublicPredictionComponent implements OnInit, OnDestroy {
  page: PublicPredictionPage = 'home';
  matches: PublicPredictionMatch[] = [];
  match: PublicPredictionMatch | null = null;
  historySummary: PublicPredictionHistorySummary | null = null;
  historyRecords: PublicPredictionHistoryRecord[] = [];
  historyRecord: PublicPredictionHistoryRecord | null = null;
  slug = '';
  archiveId = '';
  isLoading = true;
  loadError = false;
  copied = false;
  readonly publicOrigin: string;
  readonly isBrowser: boolean;
  readonly creatorPackSamples: CreatorPackSample[] = [
    {
      title: 'Purani Dilli-6 vs Outer Delhi Warriors',
      competition: 'Delhi Premier League',
      snapshotLabel: 'Verified sample · 26 Aug 2026',
      summary: 'Live match context, a probability card, explanation, talking points, caption, and source link.',
      sharePath: '/share/odw-vs-pd-t20-win-probability',
      embedPath: '/embed/odw-vs-pd-t20-win-probability',
      canonicalPath: 'https://www.crickzen.com/cric-live/odw-vs-pd-eliminator-1st-match-delhi-premier-t20-league-2026-match-updates-13CA',
      manifestPath: '/assets/public-packs/pd-vs-odw-20260826/pack-manifest.json',
      artifacts: [
        { label: 'Download MP4', path: '/assets/public-packs/pd-vs-odw-20260826/match_card_reel.mp4', downloadName: 'crickzen-pd-vs-odw-sample.mp4' },
        { label: 'Download thumbnail', path: '/assets/public-packs/pd-vs-odw-20260826/match_card_thumbnail.jpg', downloadName: 'crickzen-pd-vs-odw-thumbnail.jpg' },
        { label: 'Download report', path: '/assets/public-packs/pd-vs-odw-20260826/match_intelligence_report.json', downloadName: 'crickzen-pd-vs-odw-report.json' },
        { label: 'Download caption', path: '/assets/public-packs/pd-vs-odw-20260826/social_caption.txt', downloadName: 'crickzen-pd-vs-odw-caption.txt' }
      ]
    },
    {
      title: 'Trichy Grand Cholas vs Kovai Kings',
      competition: 'Tamil Nadu Premier League',
      snapshotLabel: 'Verified sample · 26 Aug 2026',
      summary: 'A creator-ready match brief with an attributed share card, embed preview, and canonical match context.',
      sharePath: '/share/kk-vs-tgc-t20-win-probability',
      embedPath: '/embed/kk-vs-tgc-t20-win-probability',
      canonicalPath: 'https://www.crickzen.com/cric-live/kk-vs-tgc-qualifier-2nd-match-tamil-nadu-premier-league-2026-match-updates-12ZP',
      manifestPath: '/assets/public-packs/tgc-vs-kk-20260826/pack-manifest.json',
      artifacts: [
        { label: 'Download MP4', path: '/assets/public-packs/tgc-vs-kk-20260826/match_card_reel.mp4', downloadName: 'crickzen-tgc-vs-kk-sample.mp4' },
        { label: 'Download thumbnail', path: '/assets/public-packs/tgc-vs-kk-20260826/match_card_thumbnail.jpg', downloadName: 'crickzen-tgc-vs-kk-thumbnail.jpg' },
        { label: 'Download report', path: '/assets/public-packs/tgc-vs-kk-20260826/match_intelligence_report.json', downloadName: 'crickzen-tgc-vs-kk-report.json' },
        { label: 'Download caption', path: '/assets/public-packs/tgc-vs-kk-20260826/social_caption.txt', downloadName: 'crickzen-tgc-vs-kk-caption.txt' }
      ]
    },
    {
      title: 'Noida Kings vs Kashi Rudras',
      competition: 'Uttar Pradesh T20 League',
      snapshotLabel: 'Verified sample · 26 Aug 2026',
      summary: 'A source-backed probability snapshot with reusable visual and editorial building blocks for cricket coverage.',
      sharePath: '/share/noi-vs-kas-t20-win-probability',
      embedPath: '/embed/noi-vs-kas-t20-win-probability',
      canonicalPath: 'https://www.crickzen.com/cric-live/kas-vs-noi-22nd-match-uttar-pradesh-t20-league-2026-match-updates-133H',
      manifestPath: '/assets/public-packs/noi-vs-kas-20260826/pack-manifest.json',
      artifacts: [
        { label: 'Download MP4', path: '/assets/public-packs/noi-vs-kas-20260826/match_card_reel.mp4', downloadName: 'crickzen-noi-vs-kas-sample.mp4' },
        { label: 'Download thumbnail', path: '/assets/public-packs/noi-vs-kas-20260826/match_card_thumbnail.jpg', downloadName: 'crickzen-noi-vs-kas-thumbnail.jpg' },
        { label: 'Download report', path: '/assets/public-packs/noi-vs-kas-20260826/match_intelligence_report.json', downloadName: 'crickzen-noi-vs-kas-report.json' },
        { label: 'Download caption', path: '/assets/public-packs/noi-vs-kas-20260826/social_caption.txt', downloadName: 'crickzen-noi-vs-kas-caption.txt' }
      ]
    }
  ];

  private routeSubscription: Subscription | null = null;
  private dataSubscription: Subscription | null = null;
  private loadedPageKey = '';

  constructor(
    private route: ActivatedRoute,
    private matchDataService: MatchIntelligenceDataService,
    private metaTagsService: MetaTagsService,
    private structuredDataService: StructuredDataService,
    private analyticsService: AnalyticsService,
    hostService: PublicPredictionHostService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.publicOrigin = hostService.publicOrigin;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.data.subscribe((data: any) => {
      this.page = (data && data.page) || 'home';
      this.slug = (this.route.snapshot.paramMap.get('slug') || '').trim();
      this.archiveId = (this.route.snapshot.paramMap.get('archiveId') || '').trim();
      this.loadPage();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    this.structuredDataService.clearPageSchemas();
  }

  is(page: PublicPredictionPage): boolean {
    return this.page === page;
  }

  pagePath(): string {
    switch (this.page) {
      case 'how-it-works': return '/how-it-works';
      case 'history': return '/history';
      case 'creator-packs': return '/creator-packs';
      case 'partners': return '/partners';
      case 'media-kit': return '/media-kit';
      case 'developers': return '/developers';
      case 'share': return '/share/' + encodeURIComponent(this.slug);
      case 'embed': return '/embed/' + encodeURIComponent(this.slug);
      case 'history-detail': return '/history/' + encodeURIComponent(this.archiveId);
      default: return '/';
    }
  }

  publicUrl(path: string): string {
    return this.publicOrigin + path;
  }

  creatorPackShareUrl(sample: CreatorPackSample): string {
    return this.publicUrl(sample.sharePath);
  }

  creatorPackEmbedUrl(sample: CreatorPackSample): string {
    return this.publicUrl(sample.embedPath);
  }

  creatorPackArtifactUrl(artifact: CreatorPackArtifact): string {
    return this.publicUrl(artifact.path);
  }

  creatorPackManifestUrl(sample: CreatorPackSample): string {
    return this.publicUrl(sample.manifestPath);
  }

  canonicalMatchUrl(item: PublicPredictionMatch | null): string {
    const sourceUrl = item && (item.match_url || item.detail_url) ? String(item.match_url || item.detail_url) : '';
    const sourceMatch = sourceUrl.match(/\/(?:cric-live|cricket-live-score)\/([^/?#]+)/i);
    const itemSlug = sourceMatch && sourceMatch[1]
      ? sourceMatch[1]
      : item && item.slug ? item.slug : this.slug;
    return itemSlug
      ? 'https://www.crickzen.com/cric-live/' + encodeURIComponent(itemSlug)
      : 'https://www.crickzen.com/matches';
  }

  shareUrl(item: PublicPredictionMatch | null): string {
    const itemSlug = item && item.slug ? item.slug : this.slug;
    return this.publicUrl('/share/' + encodeURIComponent(itemSlug));
  }

  matchLabel(item: PublicPredictionMatch): string {
    return item.title || 'Cricket match';
  }

  statusLabel(item: PublicPredictionMatch): string {
    const status = String(item && item.status || '').toLowerCase();
    if (status === 'running' || status === 'live') {
      return 'Live';
    }
    if (status === 'completed' || status === 'complete') {
      return 'Completed';
    }
    if (status === 'upcoming' || status === 'scheduled') {
      return 'Upcoming';
    }
    return item.status || 'Match update';
  }

  hasFreshProbability(item: PublicPredictionMatch | null): boolean {
    if (!item || !this.validProbability(item.win_probability_pct)) {
      return false;
    }
    return !!item.historical_snapshot || this.matchDataService.isPublicPredictionFresh(item);
  }

  probabilityLabel(item: PublicPredictionMatch | null): string {
    if (!item || !this.hasFreshProbability(item)) {
      return 'Unavailable';
    }
    return Math.round(Number(item.win_probability_pct)) + '%';
  }

  probabilityTeam(item: PublicPredictionMatch | null): string {
    if (!item) {
      return 'Model signal';
    }
    return item.probability_team || item.batting_team || 'Current model direction';
  }

  freshnessLabel(item: PublicPredictionMatch | null): string {
    if (item && item.historical_snapshot) {
      return item.prediction_snapshot_at
        ? 'Immutable snapshot · recorded ' + this.formatTimestamp(item.prediction_snapshot_at)
        : 'Immutable historical snapshot';
    }
    if (!item || !item.updated_at) {
      return 'Freshness not available';
    }
    if (!this.matchDataService.isPublicPredictionFresh(item)) {
      return 'Update is outside the live freshness window';
    }
    return 'Updated ' + this.formatTimestamp(item.updated_at);
  }

  formatTimestamp(value: any): string {
    const parsed = typeof value === 'number' ? value : Date.parse(String(value || ''));
    if (!parsed || isNaN(parsed)) {
      return 'recently';
    }
    return new Date(parsed).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  }

  trackPredictionView(item: PublicPredictionMatch): void {
    this.analyticsService.trackIntelligenceEvent('prediction_view', {
      surface: this.page,
      match_path: this.canonicalMatchUrl(item),
      model_available: this.hasFreshProbability(item),
      freshness_state: item.historical_snapshot
        ? 'historical'
        : (this.matchDataService.isPublicPredictionFresh(item) ? 'fresh' : 'unavailable')
    });
  }

  onShare(item: PublicPredictionMatch | null): void {
    if (!item) {
      return;
    }
    const url = this.shareUrl(item);
    this.analyticsService.trackIntelligenceEvent('prediction_card_share', {
      surface: this.page,
      match_path: this.canonicalMatchUrl(item),
      share_url: url
    });

    if (this.isBrowser && (navigator as any).share) {
      (navigator as any).share({ title: this.matchLabel(item), url: url }).catch(() => undefined);
      return;
    }

    const clipboard = this.isBrowser ? (navigator as any).clipboard : null;
    if (clipboard) {
      clipboard.writeText(url).then(() => {
        this.copied = true;
      }).catch(() => undefined);
    }
  }

  embedCode(item: PublicPredictionMatch | null): string {
    if (!item) {
      return '<iframe src="https://prediction.crickzen.com/embed/MATCH_SLUG" title="CrickZen prediction" loading="lazy"></iframe>';
    }
    return '<iframe src="' + this.shareUrl(item).replace('/share/', '/embed/') + '" title="CrickZen prediction" loading="lazy"></iframe>';
  }

  private loadPage(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      this.dataSubscription = null;
    }
    const pageKey = this.page + '|' + this.slug + '|' + this.archiveId;
    const preserveSnapshot = this.loadedPageKey === pageKey;
    if (!preserveSnapshot) {
      this.matches = [];
      this.match = null;
      this.historySummary = null;
      this.historyRecords = [];
      this.historyRecord = null;
    }
    this.loadedPageKey = pageKey;
    this.loadError = false;
    this.copied = false;
    const needsData = this.page === 'home' || this.page === 'share' || this.page === 'embed'
      || this.page === 'history' || this.page === 'history-detail';
    this.isLoading = needsData && !this.hasPageSnapshot();
    this.setMetadata();

    if (this.page === 'home') {
      this.dataSubscription = this.matchDataService.loadPublicPredictionMatches().subscribe(
        (matches) => {
          this.matches = (matches || []).slice(0, 8);
          this.isLoading = false;
        },
        () => {
          this.loadError = true;
          this.isLoading = false;
        }
      );
      return;
    }

    if ((this.page === 'share' || this.page === 'embed') && this.slug) {
      this.dataSubscription = this.matchDataService.loadPublicPredictionDetail(this.slug).subscribe(
        (match) => {
          this.match = match;
          this.isLoading = false;
          this.setMetadata();
          if (match) {
            this.trackPredictionView(match);
          }
        },
        () => {
          this.loadError = true;
          this.isLoading = false;
        }
      );
      return;
    }

    if (this.page === 'history') {
      this.dataSubscription = this.matchDataService.loadPublicPredictionHistory().subscribe(
        (summary) => {
          this.historySummary = summary;
          this.historyRecords = summary && Array.isArray(summary.records) ? summary.records : [];
          this.isLoading = false;
          this.setMetadata();
        },
        () => {
          this.loadError = true;
          this.isLoading = false;
        }
      );
      return;
    }

    if (this.page === 'history-detail' && this.archiveId) {
      this.dataSubscription = this.matchDataService.loadPublicPredictionHistoricalDetail(this.archiveId).subscribe(
        (record) => {
          this.historyRecord = record;
          this.isLoading = false;
          this.setMetadata();
        },
        () => {
          this.loadError = true;
          this.isLoading = false;
        }
      );
      return;
    }

    this.isLoading = false;
    this.setMetadata();
  }

  private hasPageSnapshot(): boolean {
    return this.matches.length > 0
      || !!this.match
      || !!this.historySummary
      || !!this.historyRecord;
  }

  private setMetadata(): void {
    const title = this.getPageTitle();
    const description = this.getPageDescription();
    const canonicalUrl = this.page === 'share' || this.page === 'embed'
      ? this.canonicalMatchUrl(this.match)
      : this.publicUrl(this.pagePath());
    // Keep the developer proposal out of search until the versioned gateway,
    // limits, and contract tests are live. The page is still shareable for
    // partner conversations.
    const indexable = this.page !== 'share' && this.page !== 'embed' && this.page !== 'developers';

    this.metaTagsService.setPageMeta(this.pagePath(), {
      title: title,
      description: description,
      canonicalUrl: canonicalUrl,
      canonicalHost: this.page === 'share' || this.page === 'embed' ? undefined : this.publicOrigin,
      robots: indexable ? 'index,follow' : 'noindex,follow',
      og: {
        title: title,
        description: description,
        url: canonicalUrl,
        image: 'https://www.crickzen.com/assets/icons/icon-512x512.png',
        imageWidth: 512,
        imageHeight: 512
      },
      twitter: {
        card: 'summary_large_image',
        site: '@crickzen',
        image: 'https://www.crickzen.com/assets/icons/icon-512x512.png'
      }
    });

    const schemas = [this.structuredDataService.page({
      name: title,
      description: description,
      url: canonicalUrl,
      type: indexable ? 'WebPage' : 'WebPage'
    })];
    if (indexable) {
      schemas.push(this.structuredDataService.organization({
        name: 'CrickZen',
        url: this.publicOrigin,
        description: 'Public cricket prediction signals, explanations, and creator-ready match intelligence.'
      }));
    }
    this.structuredDataService.setPageSchemas(schemas);
  }

  private getPageTitle(): string {
    switch (this.page) {
      case 'how-it-works': return 'How CrickZen Match Predictions Work | CrickZen';
      case 'history': return 'CrickZen Prediction History and Methodology | CrickZen';
      case 'history-detail': return this.historyRecord
        ? this.historyRecord.match_label + ' Historical Prediction | CrickZen'
        : 'CrickZen Historical Prediction';
      case 'creator-packs': return 'CrickZen Creator Match Packs | CrickZen';
      case 'partners': return 'CrickZen Creator and Publisher Partnerships | CrickZen';
      case 'media-kit': return 'CrickZen Media Kit | Cricket Prediction Product';
      case 'developers': return 'CrickZen Public Prediction API | Developers';
      case 'share': return this.match ? this.matchLabel(this.match) + ' Prediction | CrickZen' : 'CrickZen Match Prediction';
      case 'embed': return this.match ? this.matchLabel(this.match) + ' Prediction Card | CrickZen' : 'CrickZen Prediction Card';
      default: return 'CrickZen Match Predictions | Public Cricket Intelligence';
    }
  }

  private getPageDescription(): string {
    switch (this.page) {
      case 'how-it-works': return 'Understand CrickZen public match predictions, model inputs, freshness, '
        + 'explanations, limits, and responsible use.';
      case 'history': return 'Review how CrickZen records public prediction updates and publishes only '
        + 'complete, source-backed examples. Brier score, calibration, and accuracy are shown only when a completed-match ledger exists.';
      case 'history-detail': return this.historyRecord
        ? 'Immutable CrickZen prediction snapshot for ' + this.historyRecord.match_label + ', including the original forecast and recorded result.'
        : 'Immutable CrickZen historical prediction snapshot.';
      case 'creator-packs': return 'Use verified CrickZen match cards, talking points, captions, and source '
        + 'links in cricket content.';
      case 'partners': return 'Work with CrickZen on prediction cards, embeds, creator packs, newsletters, and publisher integrations.';
      case 'media-kit': return 'Approved CrickZen descriptions, attribution guidance, product language, and media contact information.';
      case 'developers': return 'Read the planned read-only CrickZen public prediction API shape, freshness '
        + 'semantics, examples, and access policy.';
      case 'share': return this.match
        ? 'A public CrickZen prediction card with a timestamp, explanation, and link to the canonical match centre.'
        : 'This CrickZen prediction card is not currently available.';
      case 'embed': return 'A compact CrickZen cricket prediction card for publisher embeds, with attribution '
        + 'and a truthful fallback state.';
      default: return 'Explore public CrickZen cricket predictions with plain-language explanations, timestamps, '
        + 'and links to live match pages.';
    }
  }

  private validProbability(value: number | null | undefined): boolean {
    return typeof value === 'number' && isFinite(value) && value >= 0 && value <= 100;
  }

  historyMetric(value: number | null | undefined, suffix: string = ''): string {
    return value === null || value === undefined || !isFinite(Number(value)) ? '—' : String(value) + suffix;
  }

  historyBucketLabel(bucket: { lower: number; upper: number }): string {
    return Math.round(bucket.lower * 100) + '–' + Math.round(bucket.upper * 100) + '%';
  }

  historyRecordProbability(record: PublicPredictionHistoryRecord): string {
    const value = record && record.prediction ? record.prediction.predicted_probability_pct : null;
    return this.historyMetric(value, '%');
  }

  historyRecordSharePath(record: PublicPredictionHistoryRecord): string {
    const aliases = record && record.public_slug_aliases ? record.public_slug_aliases : [];
    const slug = aliases.length ? aliases[0] : record.archive_id;
    return '/share/' + encodeURIComponent(slug);
  }
}

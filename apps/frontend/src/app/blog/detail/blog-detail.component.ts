import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BlogApiService, BlogPost } from '../blog-api.service';
import { BlogSeoService } from '../blog-seo.service';

@Component({
  selector: 'app-blog-detail',
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.css']
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  post: BlogPost | null = null;
  loading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogApi: BlogApiService,
    private seoService: BlogSeoService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const slug = params.get('slug');
        if (slug) {
          this.loadPost(slug);
        } else {
          this.error = 'Invalid blog post URL';
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPost(slug: string): void {
    this.loading = true;
    this.error = null;

    this.blogApi.getPostBySlug(slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post) => {
          if (post) {
            this.post = post;
            this.setSeoMetaTags(post);
          } else {
            // Post not found - navigate to 404
            this.router.navigate(['/404'], { skipLocationChange: true });
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading blog post:', err);
          this.error = 'Failed to load blog post. Please try again later.';
          this.loading = false;
        }
      });
  }

  private setSeoMetaTags(post: BlogPost): void {
    // Set page title
    this.seoService.setTitle(`${post.title} | Cricket Blog`);

    // Set meta description
    this.seoService.setMetaDescription(post.excerpt || post.seoDescription || '');

    // Set canonical URL
    this.seoService.setCanonicalUrl(`/blog/${post.slug}`);

    // Set JSON-LD structured data
    this.seoService.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.excerpt || post.seoDescription,
      'image': post.ogImageUrl || '',
      'datePublished': post.publishedAt,
      'dateModified': post.publishedAt,
      'author': {
        '@type': 'Organization',
        'name': 'Crickzen'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Crickzen',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://yourdomain.com/assets/logo.png'
        }
      }
    });

    // Set Open Graph tags
    this.seoService.setMetaTag('og:type', 'article');
    this.seoService.setMetaTag('og:title', post.title);
    this.seoService.setMetaTag('og:description', post.excerpt || post.seoDescription || '');
    this.seoService.setMetaTag('og:image', post.ogImageUrl || '');
    this.seoService.setMetaTag('og:url', `https://yourdomain.com/blog/${post.slug}`);

    // Set Twitter Card tags
    this.seoService.setMetaTag('twitter:card', 'summary_large_image');
    this.seoService.setMetaTag('twitter:title', post.title);
    this.seoService.setMetaTag('twitter:description', post.excerpt || post.seoDescription || '');
    this.seoService.setMetaTag('twitter:image', post.ogImageUrl || '');

    // Set article tags
    if (post.tags && post.tags.length > 0) {
      post.tags.forEach(tag => {
        this.seoService.setMetaTag('article:tag', tag);
      });
    }
  }

  shareOnTwitter(): void {
    if (!this.post) return;
    const url = `https://yourdomain.com/blog/${this.post.slug}`;
    const text = encodeURIComponent(this.post.title);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  }

  shareOnFacebook(): void {
    if (!this.post) return;
    const url = `https://yourdomain.com/blog/${this.post.slug}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  }

  shareOnWhatsApp(): void {
    if (!this.post) return;
    const url = `https://yourdomain.com/blog/${this.post.slug}`;
    const text = encodeURIComponent(`${this.post.title} - ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  copyLink(): void {
    if (!this.post) return;
    const url = `https://yourdomain.com/blog/${this.post.slug}`;
    // Create temporary textarea for copying
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    document.body.removeChild(textarea);
  }
}

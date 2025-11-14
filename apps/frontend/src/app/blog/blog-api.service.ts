import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  tags?: string[];
}

export interface BlogListResponse {
  data: BlogPost[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

@Injectable()
export class BlogApiService {

  private ghostUrl = environment.ghostApiUrl;
  private ghostKey = environment.ghostApiKey;
  private useMockData = false; // Using real Ghost CMS data

  constructor(private http: HttpClient) { }

  /**
   * Fetch paginated list of published blog posts
   */
  listPosts(page: number = 0, size: number = 10): Observable<BlogListResponse> {
    if (this.useMockData) {
      return this.getMockPosts(page, size);
    }

    const params = new HttpParams()
      .set('key', this.ghostKey)
      .set('limit', String(size))
      .set('page', String(page + 1))
      .set('include', 'tags,authors')
      .set('filter', 'status:published');

    return this.http.get<any>(`${this.ghostUrl}/posts/`, { params }).pipe(
      map(response => this.transformGhostResponse(response, page, size))
    );
  }

  /**
   * Fetch single blog post by slug
   */
  getPostBySlug(slug: string): Observable<BlogPost | null> {
    if (this.useMockData) {
      return this.getMockPostBySlug(slug);
    }

    const params = new HttpParams()
      .set('key', this.ghostKey)
      .set('filter', 'slug:' + slug)
      .set('include', 'tags,authors');

    return this.http.get<any>(`${this.ghostUrl}/posts/`, { params }).pipe(
      map(response => {
        const posts = response.posts || [];
        return posts.length > 0 ? this.transformGhostPost(posts[0]) : null;
      })
    );
  }

  /**
   * Transform Ghost API response format to simpler structure
   */
  private transformGhostResponse(response: any, page: number, size: number): BlogListResponse {
    const posts = response.posts || [];
    const meta = response.meta && response.meta.pagination || {};

    return {
      data: posts.map((post: any) => this.transformGhostPost(post)),
      meta: {
        pagination: {
          page: meta.page || page + 1,
          pageSize: size,
          pageCount: meta.pages || 1,
          total: meta.total || posts.length
        }
      }
    };
  }

  /**
   * Transform single Ghost post to BlogPost format
   */
  private transformGhostPost(post: any): BlogPost {
    return {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || post.custom_excerpt || '',
      content: post.html || '',
      publishedAt: post.published_at || post.created_at || '',
      seoTitle: post.meta_title || post.title,
      seoDescription: post.meta_description || post.excerpt,
      ogImageUrl: post.feature_image || undefined,
      tags: (post.tags || []).map((tag: any) => tag.name)
    };
  }

  /**
   * Transform Strapi v4 response format (kept for reference)
   */
  private transformStrapiResponse(response: any): BlogListResponse {
    const items = response.data || [];
    const meta = response.meta || { pagination: {} };

    const posts: BlogPost[] = items.map((item: any) => {
      const attrs = item.attributes || {};
      const ogImage = attrs.ogImage && attrs.ogImage.data && attrs.ogImage.data.attributes;
      return {
        id: item.id,
        title: attrs.title || '',
        slug: attrs.slug || '',
        excerpt: attrs.excerpt || '',
        content: attrs.content || '',
        publishedAt: attrs.publishedAt || attrs.createdAt || '',
        seoTitle: attrs.seoTitle,
        seoDescription: attrs.seoDescription,
        ogImageUrl: ogImage && ogImage.url || undefined,
        tags: attrs.tags || []
      };
    });

    const pagination = meta.pagination || {};
    return {
      data: posts,
      meta: {
        pagination: {
          page: pagination.page || 1,
          pageSize: pagination.pageSize || 10,
          pageCount: pagination.pageCount || 1,
          total: pagination.total || posts.length
        }
      }
    };
  }

  /**
   * Mock data for development/testing without Strapi
   */
  private getMockPosts(page: number = 0, size: number = 10): Observable<BlogListResponse> {
    const allMockPosts: BlogPost[] = [
      {
        id: 1,
        title: 'IPL 2024: Mumbai Indians vs Chennai Super Kings - Match Highlights',
        slug: 'ipl-2024-mi-vs-csk-highlights',
        excerpt: 'An thrilling encounter between two IPL giants ends with a last-ball finish...',
        content: `# Match Summary\n\nMumbai Indians faced Chennai Super Kings in a nail-biting encounter at Wankhede Stadium. \n\n## Key Moments\n\n- **First Innings**: CSK posted 185/6 in 20 overs\n- **Second Innings**: MI chased down the target with 2 balls remaining\n\n### Top Performers\n\n**Mumbai Indians**:\n- Rohit Sharma: 78 runs (52 balls)\n- Jasprit Bumrah: 3/28 (4 overs)\n\n**Chennai Super Kings**:\n- MS Dhoni: 45* (22 balls)\n- Ravindra Jadeja: 2/32 (4 overs)`,
        publishedAt: '2024-04-15T18:30:00Z',
        seoTitle: 'IPL 2024: MI vs CSK Match Highlights & Analysis',
        seoDescription: 'Complete highlights and analysis of the thrilling IPL 2024 match between Mumbai Indians and Chennai Super Kings',
        tags: ['IPL', 'Mumbai Indians', 'Chennai Super Kings', 'Cricket']
      },
      {
        id: 2,
        title: 'T20 World Cup 2024: India Qualifies for Semi-Finals',
        slug: 't20-world-cup-2024-india-semifinals',
        excerpt: 'India secured their spot in the semi-finals with a dominant performance against Australia...',
        content: `# Historic Victory\n\nIndia crushed Australia by 24 runs to book their semi-final berth.\n\n## Match Details\n\n**India**: 201/5 (20 overs)\n- Virat Kohli: 82 (49)\n- Hardik Pandya: 54* (27)\n\n**Australia**: 177/8 (20 overs)\n- Glenn Maxwell: 56 (32)\n- Kuldeep Yadav: 4/32 (4)`,
        publishedAt: '2024-06-20T14:00:00Z',
        seoTitle: 'T20 World Cup 2024: India Reaches Semi-Finals',
        seoDescription: 'India defeats Australia to qualify for T20 World Cup 2024 semi-finals with stellar performances',
        tags: ['T20 World Cup', 'India', 'Australia', 'Semi-Finals']
      },
      {
        id: 3,
        title: 'Test Cricket: England vs Pakistan Day 3 Report',
        slug: 'test-cricket-england-pakistan-day3',
        excerpt: 'England builds massive lead after Pakistan collapses on Day 3...',
        content: `# Day 3 Summary\n\n## Morning Session\nPakistan resumed at 120/3 but lost quick wickets to England's pace attack.\n\n## Afternoon Session\n- Pakistan all out for 215\n- England lead by 248 runs\n- Openers scoring freely\n\n## Key Performances\n- James Anderson: 5/42\n- Babar Azam: 78 (145)`,
        publishedAt: '2024-08-10T16:30:00Z',
        seoTitle: 'England vs Pakistan Test Match Day 3 Report',
        seoDescription: 'Comprehensive Day 3 report of the England vs Pakistan Test match with detailed analysis',
        tags: ['Test Cricket', 'England', 'Pakistan', 'Match Report']
      }
    ];

    const start = page * size;
    const paginatedPosts = allMockPosts.slice(start, start + size);

    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          data: paginatedPosts,
          meta: {
            pagination: {
              page: page + 1,
              pageSize: size,
              pageCount: Math.ceil(allMockPosts.length / size),
              total: allMockPosts.length
            }
          }
        });
        observer.complete();
      }, 300); // Simulate network delay
    });
  }

  private getMockPostBySlug(slug: string): Observable<BlogPost | null> {
    return this.getMockPosts(0, 100).pipe(
      map(response => {
        const post = response.data.find(p => p.slug === slug);
        return post || null;
      })
    );
  }
}

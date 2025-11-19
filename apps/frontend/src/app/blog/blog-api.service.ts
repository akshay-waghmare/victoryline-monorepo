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

  private strapiUrl = environment.strapiApiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Fetch paginated list of published blog posts
   */
  listPosts(page: number = 0, size: number = 10): Observable<BlogListResponse> {
    const params = new HttpParams()
      .set('pagination[page]', String(page + 1))
      .set('pagination[pageSize]', String(size))
      .set('filters[status][$eq]', 'PUBLISHED')
      .set('sort', 'publishedAt:desc')
      .set('populate', '*');

    return this.http.get<any>(`${this.strapiUrl}/blog-posts`, { params }).pipe(
      map(response => this.transformStrapiResponse(response))
    );
  }

  /**
   * Fetch single blog post by slug
   */
  getPostBySlug(slug: string): Observable<BlogPost | null> {
    const params = new HttpParams()
      .set('filters[slug][$eq]', slug)
      .set('filters[status][$eq]', 'PUBLISHED')
      .set('populate', '*');

    return this.http.get<any>(`${this.strapiUrl}/blog-posts`, { params }).pipe(
      map(response => {
        const transformed = this.transformStrapiResponse(response);
        return transformed.data.length > 0 ? transformed.data[0] : null;
      })
    );
  }

  /**
   * Transform Strapi v4 response format to simpler structure
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
        ogImageUrl: ogImage && ogImage.url
          ? `${environment.strapiMediaUrl}${ogImage.url}`
          : undefined,
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
}

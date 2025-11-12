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

    const posts: BlogPost[] = items.map((item: any) => ({
      id: item.id,
      title: item.attributes?.title || '',
      slug: item.attributes?.slug || '',
      excerpt: item.attributes?.excerpt || '',
      content: item.attributes?.content || '',
      publishedAt: item.attributes?.publishedAt || item.attributes?.createdAt || '',
      seoTitle: item.attributes?.seoTitle,
      seoDescription: item.attributes?.seoDescription,
      ogImageUrl: item.attributes?.ogImage?.data?.attributes?.url
        ? `${environment.strapiMediaUrl}${item.attributes.ogImage.data.attributes.url}`
        : undefined,
      tags: item.attributes?.tags || []
    }));

    return {
      data: posts,
      meta: {
        pagination: {
          page: meta.pagination?.page || 1,
          pageSize: meta.pagination?.pageSize || 10,
          pageCount: meta.pagination?.pageCount || 1,
          total: meta.pagination?.total || posts.length
        }
      }
    };
  }
}

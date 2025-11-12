import { Component, OnInit } from '@angular/core';
import { BlogApiService, BlogPost, BlogListResponse } from '../blog-api.service';
import { BlogSeoService } from '../blog-seo.service';

@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.css']
})
export class BlogListComponent implements OnInit {

  posts: BlogPost[] = [];
  loading = true;
  error: string | null = null;
  
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalPosts = 0;

  constructor(
    private blogApi: BlogApiService,
    private seoService: BlogSeoService
  ) { }

  ngOnInit() {
    this.loadPosts();
    this.setSeoMetaTags();
  }

  loadPosts() {
    this.loading = true;
    this.error = null;

    this.blogApi.listPosts(this.currentPage, this.pageSize).subscribe(
      (response: BlogListResponse) => {
        this.posts = response.data;
        this.totalPages = response.meta.pagination.pageCount;
        this.totalPosts = response.meta.pagination.total;
        this.loading = false;
      },
      (error) => {
        this.error = 'Failed to load blog posts. Please try again later.';
        this.loading = false;
        console.error('Blog list error:', error);
      }
    );
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadPosts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadPosts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private setSeoMetaTags() {
    this.seoService.setTitle('Cricket Blog - Latest News and Updates');
    this.seoService.setMetaDescription('Read the latest cricket news, match updates, and analysis from our expert team.');
    this.seoService.setCanonicalUrl('/blog');
  }
}

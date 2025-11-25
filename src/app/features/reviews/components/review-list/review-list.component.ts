import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Review } from '../../models/review.model';
import { ReviewService } from '../../services/review.service';
import { map } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './review-list.component.html',
  styleUrls: ['./review-list.component.css']
})
export class ReviewListComponent implements OnInit {
  @Input() vehicleId!: number;
  allReviews: Review[] = [];
  pagedReviews: Review[] = [];
  currentPage = 1;
  reviewsPerPage = 5;
  totalPages = 1;
  isLoading = true;

  constructor(private reviewService: ReviewService) {}

  ngOnInit(): void {
    if (this.vehicleId) {
      this.loadReviews();
    }
  }

  /**
   * Loads reviews for the given vehicle, applying a fallback username and
   * sorting by newest first.
   */
  public loadReviews(): void {
    this.isLoading = true;
    this.reviewService.getReviewsByVehicleId(this.vehicleId).pipe(
      map(reviews => {
        return reviews.sort((a, b) => b.id - a.id);
      })
    ).subscribe(reviewsWithNames => {
      this.allReviews = reviewsWithNames;
      this.totalPages = Math.ceil(this.allReviews.length / this.reviewsPerPage);
      this.updatePagedReviews();
      this.isLoading = false;
    });
  }

  updatePagedReviews(): void {
    const startIndex = (this.currentPage - 1) * this.reviewsPerPage;
    const endIndex = startIndex + this.reviewsPerPage;
    this.pagedReviews = this.allReviews.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedReviews();
    }
  }
}

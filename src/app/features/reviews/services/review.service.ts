import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, throwError } from 'rxjs';
import { Review } from '../models/review.model';
import { ReviewDto } from '../models/review.dto';
import { ReviewAssembler } from '../assemblers/review.assembler';
import { User } from '../../iam/models/user.model';
import { environment } from '../../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../shared/infrastructure/notification/notification.service';

interface UserSummary { id: number; name: string; }

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_REVIEWS;
  private usersApiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_USERS;

  constructor(private http: HttpClient, private translate: TranslateService, private notifier: NotificationService) {}

  /** @summary Get reviews for a vehicle enriched with user names */
  getReviewsByVehicleId(vehicleId: number): Observable<Review[]> {
    const reviews$ = this.http.get<ReviewDto[]>(`${this.apiUrl}/vehicle/${vehicleId}`);
    const users$ = this.http.get<UserSummary[]>(this.usersApiUrl);

    return forkJoin({ reviews: reviews$, users: users$ }).pipe(
      map(({ reviews, users }) =>
        reviews.map(reviewDto => {
          const user = users.find(u => u.id === reviewDto.renterId);
          reviewDto.userName = user ? user.name : this.translate.instant('REVIEWS.ANONYMOUS_USER');
          return ReviewAssembler.toModel(reviewDto);
        })
      ),
      catchError(err => {
        this.notifier.showError('ERRORS.REVIEW.LIST_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Post a review */
  postReview(review: Review): Observable<Review> {
    const dto = ReviewAssembler.toDto(review);
    return this.http.post<ReviewDto>(this.apiUrl, dto).pipe(
      map(newDto => ReviewAssembler.toModel(newDto)),
      catchError(err => {
        this.notifier.showError('ERRORS.REVIEW.CREATE_FAILED');
        return throwError(() => err);
      })
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Review } from '../models/review.model';
import { ReviewDto } from '../models/review.dto';
import { ReviewAssembler } from '../assemblers/review.assembler';
import { User } from '../../iam/models/user.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_REVIEWS;
  private usersApiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_USERS;

  constructor(private http: HttpClient) {}

  getReviewsByVehicleId(vehicleId: number): Observable<Review[]> {
    const reviews$ = this.http.get<ReviewDto[]>(`${this.apiUrl}/vehicle/${vehicleId}`);
    const users$ = this.http.get<any[]>(this.usersApiUrl);

    return forkJoin({ reviews: reviews$, users: users$ }).pipe(
      map(({ reviews, users }) =>
        reviews.map(reviewDto => {
          const user = users.find(u => u.id === reviewDto.renterId);
          reviewDto.userName = user ? user.name : 'Usuario Anónimo';
          return ReviewAssembler.toModel(reviewDto);
        })
      )
    );
  }

  postReview(review: Review): Observable<Review> {
    const dto = ReviewAssembler.toDto(review);
    return this.http.post<ReviewDto>(this.apiUrl, dto).pipe(
      map(newDto => ReviewAssembler.toModel(newDto))
    );
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.usersApiUrl);
  }
}

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/review.model';
import { AuthService } from '../../../iam/services/auth.service';
import { take } from 'rxjs';
import { User } from '../../../iam/models/user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.css']
})
export class ReviewFormComponent implements OnInit {
  @Input() vehicleId!: number;
  @Output() reviewPosted = new EventEmitter<void>();

  reviewForm: FormGroup;
  private currentUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private reviewService: ReviewService,
    private authService: AuthService,
    private translate: TranslateService
  ) {
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1)]],
      comment: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      this.currentUser = user;
    });
  }

  setRating(rating: number) {
    this.reviewForm.get('rating')?.setValue(rating);
  }

  onSubmit() {
    if (this.reviewForm.invalid || !this.currentUser) {
      alert(this.translate.instant('REVIEW_FORM.VALIDATION_REQUIRED'));
      return;
    }

    const formValue = this.reviewForm.value;
    const newReview = new Review(
      Date.now(),
      this.vehicleId,
      this.currentUser.id,
      formValue.rating!,
      formValue.comment!
    );
    newReview.userName = this.currentUser.name;

    this.reviewService.postReview(newReview).subscribe({
      next: () => {
        alert(this.translate.instant('REVIEW_FORM.THANK_YOU'));
        this.reviewPosted.emit();
        this.reviewForm.reset({ rating: 0, comment: '' });
      },
      error: (err: any) => {
        console.error('Error posting review:', err);
        alert(this.translate.instant('REVIEW_FORM.ERROR_SUBMIT'));
      }
    });
  }
}

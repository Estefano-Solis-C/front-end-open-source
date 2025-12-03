import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { User } from '../../../features/iam/models/user.model';
import { AuthService } from '../../../features/iam/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

/**
 * @summary Navigation sidebar rendering role-based links for the authenticated user.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  /**
   * @summary Stream of the current authenticated user.
   */
  currentUser$: Observable<User | null>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }
}

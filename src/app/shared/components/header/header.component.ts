import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { AuthService } from '../../../features/iam/services/auth.service';
import { User } from '../../../features/iam/models/user.model';
import { Observable } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

/**
 * @summary Application top header containing the language switcher, user info and session actions.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LanguageSwitcherComponent, TranslateModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  /**
   * @summary Emits when the menu toggle is clicked, typically to open/close a sidebar.
   */
  @Output() menuToggleClicked = new EventEmitter<void>();

  /**
   * @summary Stream of the current authenticated user or null when not authenticated.
   */
  currentUser$: Observable<User | null>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  /**
   * @summary Terminates the current session and navigates to the login page.
   */
  logout(): void {
    this.authService.logout();
  }

  /**
   * @summary Emits a menu toggle event to the parent component.
   */
  onMenuToggle(): void {
    this.menuToggleClicked.emit();
  }
}

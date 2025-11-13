import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../features/iam/services/auth.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.css']
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  currentLang: string = 'es';
  private sub?: Subscription;

  constructor(private translate: TranslateService, private authService: AuthService) {
    // Initialize with the current active language or default
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'es';
  }

  ngOnInit(): void {
    // Keep button state in sync when language changes elsewhere
    this.sub = this.translate.onLangChange.subscribe((e) => {
      this.currentLang = e.lang;
    });
  }

  /**
   * Switches the active language. If a user is authenticated, persists the
   * preference under a user-scoped key in localStorage.
   */
  switchLanguage(lang: string) {
    if (!lang || lang === this.translate.getCurrentLang()) return;

    const user = this.authService.getCurrentUser();
    if (user) {
      try {
        localStorage.setItem(`lang:user:${user.id}`, lang);
      } catch {}
    }

    this.translate.use(lang);
    this.currentLang = lang;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

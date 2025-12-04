import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../features/iam/services/auth.service';

/**
 * @summary Language preference toggle component.
 * Provides a simple UI to switch between supported languages and persists
 * the selection for authenticated users.
 */
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.css']
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  currentLang: string = 'en';
  private sub?: Subscription;

  constructor(private translate: TranslateService, private authService: AuthService) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  ngOnInit(): void {
    this.sub = this.translate.onLangChange.subscribe((e) => {
      this.currentLang = e.lang;
    });
  }

  /**
   * @summary Switch active language.
   * @param lang Target language code.
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

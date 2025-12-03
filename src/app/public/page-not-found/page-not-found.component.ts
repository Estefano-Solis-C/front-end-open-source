import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * @summary Fallback route component rendered for unknown paths.
 * Displays a translated message and a navigation action back to home.
 */
@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './page-not-found.component.html',
  styleUrls: ['./page-not-found.component.css']
})
export class PageNotFoundComponent {
  private translate = inject(TranslateService);

  title = this.translate.instant('PUBLIC.PAGE_NOT_FOUND.TITLE');
  description = this.translate.instant('PUBLIC.PAGE_NOT_FOUND.DESCRIPTION');
  goHome = this.translate.instant('PUBLIC.PAGE_NOT_FOUND.GO_HOME');
}

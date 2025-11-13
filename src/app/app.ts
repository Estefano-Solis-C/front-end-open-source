import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {
  constructor(private translate: TranslateService) {
    // Bootstrap with Spanish by default; AuthService will override per-user preference
    this.translate.setDefaultLang('es');
    this.translate.use('es');
  }
}

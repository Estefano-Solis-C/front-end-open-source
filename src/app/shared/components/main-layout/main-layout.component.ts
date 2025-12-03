import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CommonModule } from '@angular/common';

/**
 * @summary Application layout housing the header, sidebar and routed content.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, CommonModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent {
  /**
   * @summary Visibility state of the sidebar.
   */
  isSidebarVisible = false;

  /**
   * @summary Toggles the sidebar visibility state.
   */
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { UserDto } from '../models/user.dto';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../shared/infrastructure/notification/notification.service';

interface AuthResponse {
  id: number;
  email: string;
  name: string;
  roles: string[];
  token: string;
}

/**
 * @summary AuthService manages authentication, user persistence and language preference.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private notifier = inject(NotificationService);

  private baseUrl = environment.BASE_URL;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
    this.applyUserLanguage(this.currentUserSubject.value);
  }

  /** @summary Get current user synchronously */
  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /** @summary Load user from localStorage if present */
  private loadUserFromStorage() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      this.currentUserSubject.next(JSON.parse(userData));
    }
  }

  /** @summary Apply language preference for given user or fallback */
  private applyUserLanguage(user: User | null) {
    const fallback = 'en';
    if (user) {
      try {
        const savedLang = localStorage.getItem(`lang:user:${user.id}`) || fallback;
        this.translate.use(savedLang);
      } catch {
        this.translate.use(fallback);
      }
    } else {
      this.translate.use(fallback);
    }
  }

  /**
   * @summary Perform login, store token and user, navigate based on role
   * @param email user email
   * @param password user password
   */
  login(email: string, password: string): Observable<User> {
    const loginData = { email, password };

    return this.http.post<AuthResponse>(`${this.baseUrl}/authentication/sign-in`, loginData).pipe(
      map(response => {
        localStorage.setItem('authToken', response.token);
        const rawRole = response.roles?.[0];
        const user: User = {
          id: response.id,
          name: response.name,
          email: response.email,
          password: '',
          role: this.normalizeRole(rawRole)
        };
        return user;
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.applyUserLanguage(user);

        if (user.role === 'ROLE_OWNER') {
          this.router.navigate(['/my-vehicles']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(err => {
        this.notifier.showError('ERRORS.AUTH.INVALID_CREDENTIALS');
        return throwError(() => err);
      })
    );
  }

  /** @summary Logout and clear persisted auth data */
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);

    this.applyUserLanguage(null);

    this.router.navigate(['/login']);
  }

  /** @summary Register a new user */
  register(userData: UserDto): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/authentication/sign-up`, userData).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.AUTH.REGISTER_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Normalize backend response into User model */
  private adaptToUser(resp: Partial<UserDto & { roles?: string[] }>, fallback: User): User {
    const roleFromArray = Array.isArray(resp?.roles) && resp.roles.length ? resp.roles[0] : undefined;
    const rawRole = (resp as any)?.role ?? roleFromArray ?? fallback.role;
    const normalizedRole = this.normalizeRole(rawRole as string);
    return new User(
      resp?.id ?? fallback.id,
      resp?.name ?? fallback.name,
      '',
      resp?.email ?? fallback.email,
      normalizedRole
    );
  }

  /** @summary Update user information */
  updateUser(user: User): Observable<User> {
    const updateData = { name: user.name, email: user.email };
    return this.http.patch<Partial<UserDto & { roles?: string[] }>>(`${this.baseUrl}/users/${user.id}`, updateData).pipe(
      map(resp => this.adaptToUser(resp, { ...user, ...updateData })),
      tap(normalizedUser => {
        this.currentUserSubject.next(normalizedUser);
        localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
      }),
      catchError(err => {
        this.notifier.showError('ERRORS.USER.UPDATE_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Change user password */
  changePassword(userId: number, currentPassword: string, newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/users/${userId}/password`, { currentPassword, newPassword }).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.USER.PASSWORD_CHANGE_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Delete user account and logout */
  deleteAccount(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${userId}`).pipe(
      tap(() => {
        this.logout();
      }),
      catchError(err => {
        this.notifier.showError('ERRORS.USER.DELETE_FAILED');
        return throwError(() => err);
      })
    );
  }

  private normalizeRole(role?: string): string {
    switch (role) {
      case 'ROLE_ARRENDADOR':
        return 'ROLE_OWNER';
      case 'ROLE_ARRENDATARIO':
        return 'ROLE_RENTER';
      default:
        return role ?? 'ROLE_RENTER';
    }
  }
}

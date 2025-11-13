import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { UserDto } from '../models/user.dto';
import { TranslateService } from '@ngx-translate/core';

interface AuthResponse {
  id: number;
  email: string;
  name: string;
  roles: string[];
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private translate = inject(TranslateService);

  private baseUrl = environment.BASE_URL;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
    this.applyUserLanguage(this.currentUserSubject.value);
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Loads the persisted user from localStorage if present.
   */
  private loadUserFromStorage() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      this.currentUserSubject.next(JSON.parse(userData));
    }
  }

  /**
   * Applies a user-scoped language preference or falls back to Spanish.
   */
  private applyUserLanguage(user: User | null) {
    const fallback = 'es';
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
   * Authenticates the user and persists both token and user model.
   * Navigates to the proper area based on the first role.
   */
  login(email: string, password: string): Observable<User> {
    const loginData = { email, password };

    return this.http.post<AuthResponse>(`${this.baseUrl}/authentication/sign-in`, loginData).pipe(
      map(response => {
        localStorage.setItem('authToken', response.token);
        const user: User = {
          id: response.id,
          name: response.name,
          email: response.email,
          password: '',
          role: response.roles[0]
        };
        return user;
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.applyUserLanguage(user);

        if (user.role === 'ROLE_ARRENDADOR') {
          this.router.navigate(['/my-vehicles']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(error => {
        alert('Invalid credentials');
        return throwError(() => error);
      })
    );
  }

  /**
   * Clears auth token and user, resets language to default, and redirects to login.
   */
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);

    this.applyUserLanguage(null);

    this.router.navigate(['/login']);
  }

  /**
   * Registers a new user in the backend.
   */
  register(userData: UserDto): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/authentication/sign-up`, userData);
  }

  /**
   * Normalizes possibly partial backend responses into an app User model.
   */
  private adaptToUser(resp: any, fallback: User): User {
    const roleFromArray = Array.isArray(resp?.roles) && resp.roles.length ? resp.roles[0] : undefined;
    const role = (resp?.role ?? roleFromArray ?? fallback.role) as string;
    return new User(
      resp?.id ?? fallback.id,
      resp?.name ?? fallback.name,
      '',
      resp?.email ?? fallback.email,
      role
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.put<any>(`${this.baseUrl}/users/${user.id}`, user).pipe(
      map(resp => this.adaptToUser(resp, user)),
      tap(normalizedUser => {
        this.currentUserSubject.next(normalizedUser);
        localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
      })
    );
  }

  changePassword(userId: number, currentPassword: string, newPassword: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/users/${userId}/password`, { currentPassword, newPassword });
  }

  deleteAccount(userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${userId}`).pipe(
      tap(() => {
        this.logout();
      })
    );
  }
}

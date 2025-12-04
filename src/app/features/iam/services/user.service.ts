import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UserSummary {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly usersUrl = environment.BASE_URL + environment.ENDPOINT_PATH_USERS;
  private users$: Observable<UserSummary[]> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * @summary Get all users with caching via shareReplay
   * @returns Observable of users array (cached after first call)
   */
  getUsers(): Observable<UserSummary[]> {
    if (!this.users$) {
      this.users$ = this.http.get<UserSummary[]>(this.usersUrl).pipe(
        shareReplay(1)
      );
    }
    return this.users$;
  }
}


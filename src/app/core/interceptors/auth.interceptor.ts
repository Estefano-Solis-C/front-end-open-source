import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

/**
 * @summary HTTP interceptor that attaches a Bearer token to outgoing requests when available.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor() {}

  /**
   * @summary Intercepts outgoing requests and adds the Authorization header if a token exists.
   * @param req - The original HTTP request.
   * @param next - The next handler in the chain.
   * @returns An Observable of the HTTP event stream.
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('authToken');

    if (token && !req.url.includes('/authentication/')) {
      const clonedReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(clonedReq);
    }

    return next.handle(req);
  }
}

import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';


const TOKEN_KEY = 'AuthToken';
const USER_KEY = 'User';

@Injectable({
    providedIn: 'root'
  })
export class TokenStorage {

  constructor() { }

  signOut() {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
    storage.clear();
  }

  public saveToken(user:string,token: string) {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
    storage.setItem(TOKEN_KEY,  token);
    storage.setItem(USER_KEY,  user);
  }

  public getToken(): string {
    const storage = this.getStorage();
    return storage ? storage.getItem(TOKEN_KEY) : null;
  }
  public getUser(): string {
    const storage = this.getStorage();
    return storage ? storage.getItem(USER_KEY) : null;
  }

  public isTokenExpired(token: string): boolean {
    if (!token) return true;

    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return true;

    const expiryTime = decoded.exp * 1000;
    return expiryTime < Date.now();
  }

  public isLoggedIn(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || (window as any).__SSR__ || !window.sessionStorage) {
      return null;
    }
    return window.sessionStorage;
  }
}
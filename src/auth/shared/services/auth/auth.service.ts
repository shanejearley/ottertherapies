import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from 'src/store';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';

export interface User {
  email: string,
  uid: string,
  authenticated: boolean,
  emailVerified: boolean,
  mfa: boolean
}

export interface Profile {
  email: string,
  emailVerified: boolean,
  uid: string,
  displayName: string,
  url: string,
  lastTeam: string,
  role: string
}

@Injectable()
export class AuthService {
  subscription: Subscription;
  private profileDoc: AngularFirestoreDocument<Profile>;
  profile$: Observable<Profile>;
  auth$ = this.af.authState
    .pipe(
      tap(next => {
        if (!next) {
          this.store.set('user', null);
          return;
        }
        console.log('AUTH CALLED');
        const user: User = {
          email: next.email,
          uid: next.uid,
          authenticated: true,
          emailVerified: next.emailVerified,
          mfa: next.multiFactor.enrolledFactors.length > 0
        };
        this.store.set('user', user);
      })
    )

  constructor(
    private store: Store,
    private af: AngularFireAuth,
    private db: AngularFirestore,
    private router: Router
  ) { }

  get afService() {
    return this.af;
  }

  get userAuth() {
    return this.af.auth;
  }

  get user() {
    return this.af.auth.currentUser;
  }

  get authState() {
    return this.af.authState;
  }

  async createUser(email: string, password: string) {
    await this.af.auth
      .createUserWithEmailAndPassword(email, password).then(async cred => {
        await cred.user.sendEmailVerification();
      })
  }

  resendVerification() {
    return this.af.auth.currentUser.sendEmailVerification();
  }

  async reloadUser() {
    return this.af.auth.currentUser.reload();
  }

  async loginUser(email: string, password: string) {
    await this.af.auth.signInWithEmailAndPassword(email, password);
  }

  async logoutUser() {
    await this.af.auth.signOut();
    this.store.set('user', null);
    this.store.set('profile', null);
    this.store.set('teams', null);
    this.store.set('groups', null);
    this.store.set('members', null);
    this.store.set('notes', null);
    this.store.set('events', null);
    return this.router.navigate(["/auth/login"])
  }

  updateProfile(uid: string, profile: Profile) {
    return this.db.doc<Profile>(`users/${uid}`).update(profile);
  }

  async deleteUser() {
    try {
      await this.user.delete();
      this.store.set('user', null);
      this.store.set('profile', null);
      this.store.set('teams', null);
      this.store.set('groups', null);
      this.store.set('members', null);
      this.store.set('notes', null);
      this.store.set('events', null);
      return this.router.navigate(["/auth/login"])
    } catch (err) {
      console.log(err);
    }
  }

}
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from 'src/store';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';

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
  profile$: Observable<Profile>;
  auth$ = this.af.authState
    .pipe(
      tap(next => {
        if (!next) {
          this.store.set('user', null);
          return;
        }
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
    private router: Router,
    private fns: AngularFireFunctions
  ) { }

  get afService() {
    return this.af;
  }

  get userAuth() {
    return this.af;
  }


  get user() {
    return this.af.currentUser;
  }

  get authState() {
    return this.af.authState;
  }

  async createUser(email: string, password: string) {
    await this.af
      .createUserWithEmailAndPassword(email, password).then(async cred => {
        await cred.user.sendEmailVerification();
      })
  }

  async resendVerification() {
    return (await this.af.currentUser).sendEmailVerification();
  }

  async reloadUser() {
    return (await this.user).reload();
  }

  async checkClaims() {
    try {
      const idTokenResult = await (await this.user).getIdTokenResult(true)
      console.log(idTokenResult);
      return idTokenResult;
    } catch (err) {
      return console.log(err.message);
    }

  }

  async loginUser(email: string, password: string) {
    await this.af.signInWithEmailAndPassword(email, password);
  }

  async logoutUser() {
    await this.af.signOut();
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
      await (await this.user).delete();
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

  authorizeGoogle() {
    return this.fns.httpsCallable('getAuthURL')({ text: 'Get Popup Url' })
      .pipe(
        tap(next => {
          if (!next) {
            return;
          }
          return next;
        }),
        shareReplay(1)
      )
  }

  saveGoogle(code: string) {
    return this.fns.httpsCallable('createAndSaveTokens')({ code: code })
      .pipe(
        tap(next => {
          if (!next) {
            return;
          }
          return next;
        }),
        shareReplay(1)
      )
  }

}
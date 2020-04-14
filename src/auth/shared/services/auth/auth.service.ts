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
  authenticated: boolean
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
        const user: User = {
          email: next.email,
          uid: next.uid,
          authenticated: true
        };
        this.store.set('user', user);
      })
    )

  constructor(
    private store: Store,
    private af: AngularFireAuth,
    private db: AngularFirestore,
    private router: Router
  ) {}
  
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
        this.profileDoc = this.db.doc<Profile>(`users/${cred.user.uid}`);
        this.profile$ = this.profileDoc.valueChanges()
        .pipe(tap(next => {
          if (!next) {
            return;
          }
          const profile: Profile = {
            email: next.email,
            emailVerified: false,
            uid: next.uid,
            displayName: null,
            url: null,
            lastTeam: null,
            role: null
          };
          this.updateProfile(cred.user.uid, profile).then(done => {
            this.subscription.unsubscribe();
            return this.router.navigate(['/']);
          });
        }));
        this.subscription = this.profile$.subscribe();
      })
  }

  async loginUser(email: string, password: string) {
    await this.af.auth
      .signInWithEmailAndPassword(email, password).then(cred => {
        this.router.navigate(['/'])
      });
  }

  logoutUser() {
    return this.af.auth.signOut();
  }

  updateProfile(uid: string, profile: Profile) {
    return this.db.doc<Profile>(`users/${uid}`).update(profile);
  }

}
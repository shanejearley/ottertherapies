import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Store } from '../../../../store';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';

export interface Profile {
    email: string,
    emailVerified: boolean,
    uid: string,
    displayName: string,
    url: string,
    lastTeam: string,
    role: string
}

export interface Item { name: string; }

@Injectable()
export class ProfileService {
    private profileDoc: AngularFirestoreDocument<Profile>;
    private getProfileDoc: AngularFirestoreDocument<Profile>;
    profile$: Observable<Profile>;
    getProfileDoc$: Observable<Profile>;

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private authService: AuthService
    ) {
        this.authService.userAuth.onAuthStateChanged(user => {

        })

    }

    profileObservable(userId: string) {
        this.profileDoc = this.db.doc<Profile>(`users/${userId}`);
        this.profile$ = this.profileDoc.valueChanges()
        .pipe(tap(next => {
            if (!next) {
                this.store.set('profile', null);
                return;
            }
            const profile: Profile = {
                email: next.email,
                emailVerified: next.emailVerified,
                uid: next.uid,
                displayName: next.displayName,
                url: next.url,
                lastTeam: next.lastTeam,
                role: next.role
            };
            this.store.set('profile', profile)
        }))
        return this.profile$;
    }

    get uid() {
        return this.authService.user.uid;
    }

    updateProfile(uid: string, profile: Profile) {
        return this.db.doc<Profile>(`users/${uid}`).update(profile);
    }

    getProfile(doc) {
        this.getProfileDoc = this.db.doc<Profile>(`users/${doc.uid}`)
        this.getProfileDoc.valueChanges()
            .pipe(tap(next => {
                if (!next) {
                    return;
                }
                return doc.profile = next;
            })).subscribe();
    }

}
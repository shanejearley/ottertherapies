import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as firebase from "firebase";

import { Store } from '../../../../store';
import { File } from '../../../../app/shared/services/groups/groups.service'

import { Observable } from 'rxjs';
import {
    tap,
    filter,
    map,
    switchMap,
    take
} from 'rxjs/operators';
import { of } from 'rxjs';

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
        this.getProfileDoc$ = this.getProfileDoc.valueChanges()
            .pipe(tap(next => {
                if (!next) {
                    return;
                }
                doc.profile = next;
            }))
        this.getProfileDoc$.subscribe();
    }



    //   getMeal(key: string) {
    //     if (!key) return Observable.of({});
    //     return this.store.select<Meal[]>('meals')
    //       .filter(Boolean)
    //       .map(meals => meals.find((meal: Meal) => meal.$key === key));
    //   }

    //   addMeal(meal: Meal) {
    //     return this.db.list(`meals/${this.uid}`).push(meal);
    //   }

    //   updateMeal(key: string, meal: Meal) {
    //     return this.db.object(`meals/${this.uid}/${key}`).update(meal);
    //   }

    //   removeMeal(key: string) {
    //     return this.db.list(`meals/${this.uid}`).remove(key);
    //   }

}
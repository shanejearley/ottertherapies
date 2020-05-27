import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import 'firebase/storage';

import { Store } from '../../../../store';

import { Observable } from 'rxjs';
import { tap, last, switchMap, finalize, shareReplay } from 'rxjs/operators';

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';

export interface Profile {
    email: string,
    uid: string,
    displayName: string,
    url: string,
    lastTeam: string,
    role: string,
    fcmTokens: object,
    badge: number,
    gcalSync: boolean,
    refresh_token: boolean
}

export interface Item { name: string; }

@Injectable()
export class ProfileService {
    private profileDoc: AngularFirestoreDocument<Profile>;
    private getProfileDoc: AngularFirestoreDocument<Profile>;
    profile$: Observable<Profile>;
    profile: Profile;
    getProfileDoc$: Observable<Profile>;
    downloadURL: string;
    percentageChanges: any;

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private storage: AngularFireStorage,
        private authService: AuthService
    ) {
        this.authService.userAuth.onAuthStateChanged(user => {

        })

    }

    profileObservable(userId: string) {
        this.profileDoc = this.db.doc<Profile>(`users/${userId}`);
        this.profile$ = this.profileDoc.valueChanges()
            .pipe(
                tap(next => {
                    if (!next) {
                        this.store.set('profile', null);
                        return;
                    }
                    console.log('PROFILE RETRIEVED')
                    const profile: Profile = {
                        email: next.email ? next.email : null,
                        uid: next.uid ? next.uid : null,
                        displayName: next.displayName ? next.displayName : null,
                        url: next.url ? next.url : null,
                        lastTeam: next.lastTeam ? next.lastTeam : null,
                        role: next.role ? next.role : null,
                        fcmTokens: next.fcmTokens ? next.fcmTokens : null,
                        badge: next.badge ? next.badge : null,
                        gcalSync: next.gcalSync ? next.gcalSync : null,
                        refresh_token: next.refresh_token ? next.refresh_token : null
                    };
                    this.profile = profile;
                    this.store.set('profile', profile)
                }),
                shareReplay(1)
            )
        return this.profile$;
    }

    get uid() {
        return this.authService.user.uid;
    }

    get currentProfile() {
        return this.profile;
    }

    updateProfile(uid: string, profile: Profile) {
        return this.db.doc<Profile>(`users/${uid}`).update(profile);
    }

    async updateProfilePicture(picture: string, profile: Profile) {
        console.log('updateprofilepicture')
        return this.uploadPicture(picture, profile)
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

    uploadPicture(picture, profile) {
        try {
            console.log('tryuploadpicture')
            const fileId = this.db.createId();
            const filePath = `users/${this.uid}/profile/${fileId}`;
            const storageRef = this.storage.ref(filePath);
            const task = storageRef.putString(picture, 'data_url');
            this.percentageChanges = task.percentageChanges();
            task.snapshotChanges().pipe(
                finalize(() => {
                    storageRef.getDownloadURL().subscribe(url => {
                        this.downloadURL = url;
                        profile.url = this.downloadURL;
                        this.percentageChanges = null;
                        return this.updateProfile(this.uid, profile);
                    })
                })
                // last(),
                // switchMap(() => storageRef.getDownloadURL())
            ).subscribe()
        } catch (err) {
            return err;
        }
    }

    updateBadge(uid, badge) {
        if (this.currentProfile.badge !== badge) {
            return this.db.doc(`users/${uid}`).set({
                badge: badge
            }, { merge: true });
        } else {
            return console.log('Badge up to date');
        }
    }

    turnSyncOn() {
        return this.db.doc(`users/${this.uid}`).set({
            gcalSync: true
        }, { merge: true });
    }

    turnSyncOff() {
        return this.db.doc(`users/${this.uid}`).set({
            gcalSync: false
        }, { merge: true });
    }

}
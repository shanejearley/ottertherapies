import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import 'firebase/storage';

import { Store } from '../../../../store';

import { Observable } from 'rxjs';
import { tap, last, switchMap } from 'rxjs/operators';

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';

export interface Profile {
    email: string,
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
            .pipe(tap(next => {
                if (!next) {
                    this.store.set('profile', null);
                    return;
                }
                console.log('PROFILE RETRIEVED')
                const profile: Profile = {
                    email: next.email,
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
            console.log(picture);
            const task = storageRef.putString(picture, 'data_url');
            this.percentageChanges = task.percentageChanges();
            task.snapshotChanges().pipe(
                last(),
                switchMap(() => storageRef.getDownloadURL())
            ).subscribe(url => {
                console.log('newUrl', url)
                this.downloadURL = url;
                profile.url = this.downloadURL;
                console.log('profilebeforeupdate', profile);
                this.updateProfile(this.uid, profile);
                this.percentageChanges = null;
            })
        } catch (err) {
            return err;
        }
    }

    get uploadPercent() {
        return this.percentageChanges;
    }

}
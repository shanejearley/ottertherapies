import { Component, Input } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { NavParams, ModalController } from '@ionic/angular';

import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import 'firebase/storage';

import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';
import { tap, filter, map, finalize, last, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Group } from '../../../shared/services/groups/groups.service';
import { Member } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';

@Component({
    selector: 'app-upload',
    templateUrl: 'upload.component.html'
})
export class UploadComponent {
    meta: Observable<any>;
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    uploadPercent: Observable<number>;
    downloadURL: Observable<string>;
    photo: SafeResourceUrl;
    photoData: string;
    photoId: string;
    photoName: string;
    teamId: string;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private db: AngularFirestore,
        private storage: AngularFireStorage,
        private store: Store,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
        this.groups$ = this.store.select<Group[]>('groups');
        this.members$ = this.store.select<Member[]>('members');
    }

    ionViewWillEnter() {
        this.photo = this.navParams.get('photo');
        this.photoData = this.navParams.get('photoData');
        this.photoName = this.navParams.get('photoName');
        this.photoId = this.navParams.get('photoId');
        this.teamId = this.navParams.get('teamId');
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    upload() {

    }

    loopFolders() {
        this.groups$.pipe(map(groups => {
            groups.forEach(g => {
                if (g.isChecked) {
                    g.isChecked = !g.isChecked;
                    const filePath = `teams/${this.teamId}/groups/${g.id}/files/${this.photoId}`;
                    const storageRef = this.storage.ref(filePath);
                    const filesRef = this.db.collection<File>(`teams/${this.teamId}/groups/${g.id}/files`);
                    const docRef = this.db.doc<File>(`teams/${this.teamId}/groups/${g.id}`);
                    this.uploadScan(filesRef, storageRef, docRef);
                }
            })
        })).subscribe()

        this.members$.pipe(map(members => {
            members.forEach(m => {
                if (m.isChecked) {
                    m.isChecked = !m.isChecked;
                    if (m.uid !== this.uid) {
                        const pathId = this.uid < m.uid ? this.uid + m.uid : m.uid + this.uid;
                        const filePath = `teams/${this.teamId}/direct/${pathId}/files/${this.photoId}`;
                        const storageRef = this.storage.ref(filePath);
                        const filesRef = this.db.collection<File>(`teams/${this.teamId}/direct/${pathId}/files`);
                        const docRef = this.db.doc<File>(`teams/${this.teamId}/direct/${pathId}`);
                        this.uploadScan(filesRef, storageRef, docRef);
                    } else {
                        const filePath = `users/${this.uid}/teams/${this.teamId}/files/${this.photoId}`;
                        const storageRef = this.storage.ref(filePath);
                        const filesRef = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
                        const docRef = this.db.doc<File>(`users/${this.uid}/teams/${this.teamId}`);
                        this.uploadScan(filesRef, storageRef, docRef);
                    }
                }
            })
        })).subscribe()
    }

    get uid() {
        return this.authService.user.uid;
    }

    uploadScan(filesRef, storageRef, docRef) {
        const task = storageRef.putString(this.photoData, 'base64', { contentType: 'image/jpg' });
        this.uploadPercent = task.percentageChanges();
        task.snapshotChanges().pipe(
            last(),
            switchMap(() => storageRef.getDownloadURL())
        ).subscribe(url => {
            this.downloadURL = url
            storageRef.getMetadata().subscribe(meta => {
                this.uploadPercent = null;
                const size = meta.size;
                const type = meta.contentType;
                filesRef.doc(this.photoId).set({
                    name: this.photoName+'.jpg',
                    size: size,
                    timestamp: firestore.FieldValue.serverTimestamp(),
                    type: type,
                    uid: this.uid,
                    url: this.downloadURL,
                    profile: null
                })
                docRef.update({
                    lastFile: this.photoName+'.jpg',
                    lastFileId: this.photoId,
                    lastFileUid: this.uid
                })
                this.modalController.dismiss({
                    response: 'success'
                });
            });
        })
    }
}
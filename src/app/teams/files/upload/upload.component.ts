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
    photoName: string;
    teamId: string;
    pdfData: string;
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
        this.teamId = this.navParams.get('teamId');
        this.pdfData = this.navParams.get('pdfData');
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
                    const fileId = this.db.createId();
                    const filePath = `teams/${this.teamId}/groups/${g.id}/files/${fileId}`;
                    const storageRef = this.storage.ref(filePath);
                    const filesRef = this.db.collection<File>(`teams/${this.teamId}/groups/${g.id}/files`);
                    const docRef = this.db.doc<File>(`teams/${this.teamId}/groups/${g.id}`);
                    this.uploadScan(filesRef, storageRef, docRef, fileId);
                }
            })
        })).subscribe()

        this.members$.pipe(map(members => {
            members.forEach(m => {
                if (m.isChecked) {
                    m.isChecked = !m.isChecked;
                    if (m.uid !== this.uid) {
                        const fileId = this.db.createId();
                        const pathId = this.uid < m.uid ? this.uid + m.uid : m.uid + this.uid;
                        const filePath = `teams/${this.teamId}/direct/${pathId}/files/${fileId}`;
                        const storageRef = this.storage.ref(filePath);
                        const filesRef = this.db.collection<File>(`teams/${this.teamId}/direct/${pathId}/files`);
                        const docRef = this.db.doc<File>(`teams/${this.teamId}/direct/${pathId}`);
                        this.uploadScan(filesRef, storageRef, docRef, fileId);
                    } else {
                        const fileId = this.db.createId();
                        const filePath = `users/${this.uid}/teams/${this.teamId}/files/${fileId}`;
                        const storageRef = this.storage.ref(filePath);
                        const filesRef = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
                        const docRef = this.db.doc<File>(`users/${this.uid}/teams/${this.teamId}`);
                        this.uploadScan(filesRef, storageRef, docRef, fileId);
                    }
                }
            })
        })).subscribe()
    }

    get uid() {
        return this.authService.user.uid;
    }

    uploadScan(filesRef, storageRef, docRef, fileId) {
        const task = storageRef.putString(this.pdfData, 'base64', { contentType: 'application/pdf' });
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
                filesRef.doc(fileId).set({
                    name: this.photoName+'.pdf',
                    size: size,
                    timestamp: firestore.FieldValue.serverTimestamp(),
                    type: type,
                    uid: this.uid,
                    url: this.downloadURL,
                    profile: null
                })
                docRef.set({
                    lastFile: this.photoName+'.pdf',
                    lastFileId: fileId,
                    lastFileUid: this.uid
                }, {merge:true})
                this.modalController.dismiss({
                    response: 'success'
                });
            });
        })
    }
}
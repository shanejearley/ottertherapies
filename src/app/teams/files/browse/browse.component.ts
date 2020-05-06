import { Component, Input } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { NavParams, ModalController } from '@ionic/angular';

import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import 'firebase/storage';

import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';

import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';
import { tap, filter, map, finalize, last, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Group } from '../../../shared/services/groups/groups.service';
import { Member } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';

@Component({
    selector: 'app-browse',
    templateUrl: 'browse.component.html',
    styleUrls: ['./browse.component.scss'],
})
export class BrowseComponent {
    meta: Observable<any>;
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    uploadPercent: Observable<number>;
    downloadURL: string;
    teamId: string;
    count: number;
    folder;
    public ngxFiles: NgxFileDropEntry[] = [];
    public files: File[] = [];

    public dropped(files: NgxFileDropEntry[]) {
        for (const droppedFile of files) {
            if (droppedFile.fileEntry.isFile) {
                const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
                fileEntry.file((file: File) => {
                    this.ngxFiles.push(droppedFile);
                    this.files.push(file);
                    console.log(droppedFile, file);
                });
            } else {
                const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
                console.log(droppedFile, fileEntry);
                this.ngxFiles.push(droppedFile);
                //this.files.push(file);
            }
        }
    }

    public fileOver(event) {
        console.log(event);
    }

    public fileLeave(event) {
        console.log(event);
    }

    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private db: AngularFirestore,
        private storage: AngularFireStorage,
        private store: Store,
        private authService: AuthService,
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
        this.groups$ = this.store.select<Group[]>('groups');
        this.members$ = this.store.select<Member[]>('members');
        this.groups$.pipe(tap((groups) => {
            if (groups) {
                groups.forEach(g => {
                    g.isChecked = false;
                })
            }
        })).subscribe();
        this.members$.pipe(tap((members) => {
            if (members) {
                members.forEach(m => {
                    m.isChecked = false;
                })
            }
        })).subscribe();
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    reset() {
        this.files = [];
        this.folder = null;
    }

    async loopFiles() {
        console.log(this.folder);
        // this.count = 0;
        // for (let i = 0; i < this.files.length + 1; i++) {
        //     const droppedFile = this.files[i];
        //     if (droppedFile && droppedFile.fileEntry.isFile) {
        //         const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        //         fileEntry.file((file: File) => {
        //             this.loopFolders(file);
        //         });
        //     }
        //     if (droppedFile && !droppedFile.fileEntry.isFile) {
        //         const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        //         this.loopFolders(fileEntry);
        //     }
        // }
    }

    loopFolders(file) {
        this.count += 1;
        this.groups$.pipe(map(groups => {
            groups.forEach(g => {
                if (g.isChecked) {
                    const fileId = this.db.createId();
                    const filePath = `teams/${this.teamId}/groups/${g.id}/files/${fileId}`;
                    const storageRef = this.storage.ref(filePath);
                    const filesRef = this.db.collection<File>(`teams/${this.teamId}/groups/${g.id}/files`);
                    const docRef = this.db.doc<File>(`teams/${this.teamId}/groups/${g.id}`);
                    this.uploadFile(filePath, filesRef, storageRef, docRef, file, fileId);
                }
                if (g.isChecked && this.count == this.files.length) {
                    g.isChecked = !g.isChecked;
                }
            })
        })).subscribe()

        this.members$.pipe(map(members => {
            members.forEach(m => {
                if (m.isChecked) {
                    if (m.uid !== this.uid) {
                        const fileId = this.db.createId();
                        const pathId = this.uid < m.uid ? this.uid + m.uid : m.uid + this.uid;
                        const filePath = `teams/${this.teamId}/direct/${pathId}/files/${fileId}`;
                        const storageRef = this.storage.ref(filePath);
                        const filesRef = this.db.collection<File>(`teams/${this.teamId}/direct/${pathId}/files`);
                        const docRef = this.db.doc<File>(`teams/${this.teamId}/direct/${pathId}`);
                        this.uploadFile(filePath, filesRef, storageRef, docRef, file, fileId);
                    } else {
                        const fileId = this.db.createId();
                        const filePath = `users/${this.uid}/teams/${this.teamId}/files/${fileId}`;
                        const storageRef = this.storage.ref(filePath);
                        const filesRef = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
                        const docRef = this.db.doc<File>(`users/${this.uid}/teams/${this.teamId}`);
                        this.uploadFile(filePath, filesRef, storageRef, docRef, file, fileId);
                    }
                }
                if (m.isChecked && this.count == this.files.length) {
                    m.isChecked = !m.isChecked;
                }
            })
        })).subscribe()
    }

    get uid() {
        return this.authService.user.uid;
    }

    uploadFile(filePath, filesRef, storageRef, docRef, file, fileId) {
        const task = this.storage.upload(filePath, file);
        this.uploadPercent = task.percentageChanges();
        task.snapshotChanges().pipe(
            last(),
            switchMap(() => storageRef.getDownloadURL())
        ).subscribe((url: string) => {
            this.downloadURL = url;
            filesRef.doc(fileId).set({
                name: file.name,
                size: file.size,
                timestamp: firestore.FieldValue.serverTimestamp(),
                type: file.type,
                uid: this.uid,
                url: this.downloadURL,
                profile: null
            })
            docRef.set({
                lastFile: file.name,
                lastFileId: fileId,
                lastFileUid: this.uid
            }, { merge: true })
            if (this.count == this.files.length) {
                console.log(this.count, this.files.length);
                this.modalController.dismiss({
                    response: 'success'
                });
            }
        });
    }
}
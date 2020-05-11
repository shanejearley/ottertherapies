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

    get uid() {
        return this.authService.user.uid;
    }

}
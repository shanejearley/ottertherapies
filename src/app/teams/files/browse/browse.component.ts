import { Component, ViewChild } from '@angular/core';
import { NavParams, ModalController, IonSlides, Platform, AlertController } from '@ionic/angular';

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
    isHovering: boolean;

    files: File[] = [];

    toggleHover(event: boolean) {
        this.isHovering = event;
    }

    onDrop(files: FileList) {
        for (let i = 0; i < files.length; i++) {
            if (files.item(i).size > 25000000) {
                this.largeFileAlert();
            } else {
                this.files.push(files.item(i));
            }
        }
    }

    onFileChange(ev) {
        const files: FileList = ev.target.files;
        for (let i = 0; i < files.length; i++) {
            if (files.item(i).size > 25000000) {
                this.largeFileAlert();
            } else {
                this.files.push(files.item(i));
            }
        }
    }

    desktop: boolean;
    ios: boolean;
    android: boolean;

    @ViewChild('slider', { static: false }) slides: IonSlides;
    index: number = 0;

    sourceId: string;
    meta: Observable<any>;
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    uploadPercent: Observable<number>;
    downloadURL: string;
    teamId: string;
    count: number;
    folder;

    nextSlide() {
        return this.slides.slideNext();
    }

    prevSlide() {
        return this.slides.slidePrev();
    }

    async getSlideIndex() {
        return this.index = await this.slides.getActiveIndex()
    }

    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private db: AngularFirestore,
        private platform: Platform,
        private store: Store,
        private authService: AuthService,
        private alertController: AlertController
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
        this.groups$ = this.store.select<Group[]>('groups');
        this.members$ = this.store.select<Member[]>('members');
        this.platform.ready().then(() => {
            this.desktop = this.platform.is('desktop');
            this.ios = this.platform.is('ios') && this.platform.is('capacitor');
            this.android = this.platform.is('android') && this.platform.is('capacitor');
            console.log(this.desktop, this.ios, this.android)
        })
    }

    ionViewWillEnter() {
        this.slides.update();
        this.slides.lockSwipes(true);
        this.teamId = this.navParams.get('teamId');
        this.sourceId = this.navParams.get('sourceId');
        if (this.sourceId !== 'files') {
            this.members$.pipe(tap(ms => {
                if (ms) {
                    this.folder = ms.find(m => m.uid === this.sourceId);
                }
            })).subscribe()
        }
    }

    async largeFileAlert() {
        const alert = await this.alertController.create({
          // header: 'One sec!',
          // subHeader: 'Scanning is a mobile feature',
          message: 'Your file is larger than our limit of 25MB! Try a smaller version.',
          buttons: ['OK']
        });
    
        await alert.present();
    }

    async folderChange() {
        if (this.folder) {
            await this.slides.lockSwipes(false);
            return setTimeout(() => this.slides.slideNext(), 500)
        } else {
            console.log('Select a folder');
        }
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
    }

}
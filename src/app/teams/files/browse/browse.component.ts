import { Component } from '@angular/core';
import { NavParams, ModalController, Platform, AlertController } from '@ionic/angular';

import { AngularFirestore } from '@angular/fire/firestore';
import 'firebase/storage';

import { Observable } from 'rxjs';

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

    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    isHovering: boolean;

    files: File[];

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
        this.teamId = this.navParams.get('teamId');
        this.folder = this.navParams.get('folder');
        this.files = this.navParams.get('files');
    }

    async removeFile(file) {
        const index = this.files.indexOf(file);
        return this.files.splice(index, 1);
    }

    async largeFileAlert() {
        const alert = await this.alertController.create({
          message: 'Your file is larger than our limit of 25MB! Try a smaller version.',
          buttons: ['OK']
        });
    
        await alert.present();
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
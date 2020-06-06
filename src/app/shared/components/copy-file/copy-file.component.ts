import { Component, Output, EventEmitter } from '@angular/core';
import { NavParams, Platform, ModalController } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Router } from '@angular/router';
import { Store } from 'src/store';
import { Observable, Subject } from 'rxjs';
import { tap, takeUntil } from 'rxjs/operators';
import { DarkService } from '../../services/dark/dark.service';
import { Profile } from 'src/auth/shared/services/profile/profile.service';
import { Group } from '../../services/groups/groups.service';
import { Member } from '../../services/members/members.service';
const { Browser } = Plugins;

@Component({
    selector: 'app-copy-file',
    templateUrl: 'copy-file.component.html',
    styleUrls: ['./copy-file.component.scss']
})
export class CopyFileComponent {

    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;

    desktop: boolean;
    ios: boolean;
    android: boolean;

    teamId: string;
    folder;
    file;
    uid: string;

    copyFolder;

    private readonly onDestroy = new Subject<void>();

    constructor(
        private navParams: NavParams,
        private modalController: ModalController,
        private authService: AuthService,
        private router: Router,
        private darkService: DarkService,
        private platform: Platform,
        private store: Store
    ) { }

    ngOnInit() {
        //
    }

    ionViewWillEnter() {

        this.profile$ = this.store.select('profile');
        this.groups$ = this.store.select('groups');
        this.members$ = this.store.select('members');

        this.platform.ready().then(() => {
            this.desktop = this.platform.is('desktop');
            this.ios = this.platform.is('ios') && this.platform.is('capacitor');
            this.android = this.platform.is('android') && this.platform.is('capacitor');
            console.log(this.desktop, this.ios, this.android)
        })

        this.teamId = this.navParams.get('teamId');
        this.folder = this.navParams.get('folder');
        this.file = this.navParams.get('file');
        this.uid = this.navParams.get('uid');

    }

    folderChange(ev) {
        this.copyFolder = ev.target.value;
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismiss'
        });
    }

    copy() {
        this.modalController.dismiss({
            response: 'copy',
            folder: this.copyFolder
        });
    }
    

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
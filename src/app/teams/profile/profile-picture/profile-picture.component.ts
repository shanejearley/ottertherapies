import { Component } from '@angular/core';
import { NavParams, ModalController, AlertController, Platform } from '@ionic/angular';

import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';

import { ImageCroppedEvent } from 'ngx-image-cropper';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile, ProfileService } from '../../../../auth/shared/services/profile/profile.service';
import { Store } from 'src/store';
import { Team, TeamsService } from 'src/app/shared/services/teams/teams.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-profile-picture',
    templateUrl: 'profile-picture.component.html',
    styleUrls: ['./profile-picture.component.scss']
})
export class ProfilePictureComponent {

    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    desktop: boolean;
    ios: boolean;
    android: boolean;

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
                const newFileEvent = {
                    target: {
                        files: [files.item(i)]
                    }
                }
                this.imageChangedEvent = newFileEvent;
            }
        }
    }

    onFileChange(ev) {
        const files: FileList = ev.target.files;
        for (let i = 0; i < files.length; i++) {
            if (files.item(i).size > 25000000) {
                this.largeFileAlert();
            } else {
                this.imageChangedEvent = ev;
            }
        }
    }

    async largeFileAlert() {
        const alert = await this.alertController.create({
          message: 'Your file is larger than our limit of 25MB! Try a smaller version.',
          buttons: ['OK']
        });
    
        await alert.present();
    }

    team$: Observable<Team>;
    teamId: string;
    currentTeam;
    imageChangedEvent: any = '';
    croppedImage: any = '';
    croppedImageBlob: any;
    currentProfile: Profile;
    profilePicture: string;
    profile$: Observable<Profile>;
    error: boolean;
    done: boolean = false;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private authService: AuthService,
        private alertController: AlertController,
        private platform: Platform
    ) { }

    imageCropped(event: ImageCroppedEvent) {
        this.croppedImage = event.base64;
    }
    imageLoaded() {
        // show cropper
    }
    cropperReady() {
        // cropper ready
    }
    loadImageFailed() {
        // show message
    }

    ngOnInit() {
        this.platform.ready().then(() => {
            this.desktop = this.platform.is('desktop');
            this.ios = this.platform.is('ios') && this.platform.is('capacitor');
            this.android = this.platform.is('android') && this.platform.is('capacitor');
            console.log(this.desktop, this.ios, this.android)
        })
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
        this.imageChangedEvent = null;
        this.croppedImage = null;
    }

    get uid() {
        return this.authService.user.uid;
    }

}
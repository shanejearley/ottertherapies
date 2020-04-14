import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ImageCroppedEvent } from 'ngx-image-cropper';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile, ProfileService } from '../../../../auth/shared/services/profile/profile.service';
import { Store } from 'src/store';

@Component({
    selector: 'app-profile-picture',
    templateUrl: 'profile-picture.component.html',
    styleUrls: ['./profile-picture.component.scss']
})
export class ProfilePictureComponent {
    imageChangedEvent: any = '';
    croppedImage: any = '';
    croppedImageBlob: any;
    currentProfile: Profile;
    profilePicture: string;
    profile$: Observable<Profile>;
    error: boolean;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private profileService: ProfileService
    ) { }

    public fileOver(event) {
        console.log(event);
    }

    public fileLeave(event) {
        console.log(event);
    }

    fileChangeEvent(event: any): void {
        console.log(event);
        this.imageChangedEvent = event;
    }
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
        this.profile$ = this.store.select<Profile>('profile');
        this.profile$.pipe(tap(profile => {
            this.currentProfile = profile;
        })).subscribe();
    }

    ionViewWillEnter() {
        //this.teamId = this.navParams.get('teamId');
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
    }

    updateProfilePicture() {
        try {
            this.profileService.updateProfilePicture(this.croppedImage, this.currentProfile);
            setTimeout(() => {
                return this.modalController.dismiss({
                    response: 'success'
                });
            }, 5000)
        } catch (err) {
            console.log(err);
            return this.modalController.dismiss({
                response: err
            })
        }
    }

    get uploadPercent() {
        return this.profileService.uploadPercent;
    }

}
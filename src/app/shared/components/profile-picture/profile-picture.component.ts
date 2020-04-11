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
    updatedProfile: Profile;
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

    fileChangeEvent(event: any): void {
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
            this.updatedProfile = profile;
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
            this.profileService.updateProfilePicture(this.uid, this.updatedProfile);
        } catch (err) {
            return this.modalController.dismiss({
                response: err
            })
        }
        return this.modalController.dismiss({
            response: 'success'
        });
    }

}
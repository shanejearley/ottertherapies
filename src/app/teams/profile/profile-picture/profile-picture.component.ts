import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

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
        private store: Store,
        private authService: AuthService,
        private profileService: ProfileService,
        private activatedRoute: ActivatedRoute,
        private teamsService: TeamsService
    ) { }

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
        //
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
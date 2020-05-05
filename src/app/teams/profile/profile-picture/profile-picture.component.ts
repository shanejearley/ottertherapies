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
    currentTeam;
    imageChangedEvent: any = '';
    croppedImage: any = '';
    croppedImageBlob: any;
    currentProfile: Profile;
    profilePicture: string;
    profile$: Observable<Profile>;
    error: boolean;
    done: boolean = false;
    type: string;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private profileService: ProfileService,
        private activatedRoute: ActivatedRoute,
        private teamsService: TeamsService
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
        //
    }

    ionViewWillEnter() {
        this.type = this.navParams.get('type');
        if (this.type === 'profile') {
            this.profile$ = this.store.select<Profile>('profile');
            this.profile$.pipe(tap(profile => {
                this.currentProfile = profile;
            })).subscribe();
        } else if (this.type === 'child') {
            this.team$ = this.activatedRoute.params
                .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
            this.team$.subscribe(team => {
                this.currentTeam = {
                    id: team.id ? team.id : null,
                    name: team.name ? team.name : null,
                    publicId: team.publicId ? team.publicId : null,
                    child: team.child ? team.child : null,
                    bio: team.bio ? team.bio : null,
                    url: team.url ? team.url : null,
                }
            })
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

    async updateProfilePicture() {
        try {
            if (this.type === 'profile') {
                await this.profileService.updateProfilePicture(this.croppedImage, this.currentProfile);
            } else if (this.type === 'child') {
                console.log('build update function in service')
                //await this.teamsService.updateProfilePicture(this.croppedImage, this.currentTeam);
            }
            return this.modalController.dismiss({
                response: 'success'
            });
        } catch (err) {
            console.log(err);
            return this.modalController.dismiss({
                response: err
            })
        }
    }

}
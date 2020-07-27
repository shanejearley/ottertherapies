import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { Observable } from 'rxjs';
import { tap, map, filter, take } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile, ProfileService } from '../../../../auth/shared/services/profile/profile.service';
import { Store } from 'src/store';

@Component({
    selector: 'app-delete-user',
    templateUrl: 'delete-user.component.html',
    styleUrls: ['./delete-user.component.scss']
})
export class DeleteUserComponent {

    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    emailConfirm: string;
    emailFocus: boolean;

    confirm = {
        isChecked: false
    }
    currentProfile: Profile;
    profile$: Observable<Profile>;
    error: boolean;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private profileService: ProfileService
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
    }

    async getProfile() {
        this.currentProfile = await this.profile$.pipe(filter(Boolean), take(1), map((profile: Profile) => profile)).toPromise()
    }

    ionViewWillEnter() {
        this.getProfile();
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
    }

    deleteUser() {
        return this.modalController.dismiss({
            response: 'delete'
        });
    }

}
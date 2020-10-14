import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { Observable, Subject } from 'rxjs';
import { tap, takeUntil, map } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile, ProfileService } from '../../../../auth/shared/services/profile/profile.service';
import { Store } from 'src/store';

@Component({
    selector: 'app-edit-profile',
    templateUrl: 'edit-profile.component.html',
    styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent {
    uid: string;
    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    nameFocus: boolean;
    roleFocus: boolean;

    confirm = {
        isChecked: false
    }
    profile: any;
    currentProfile: Profile;
    profile$: Observable<Profile>;
    error: boolean;

    firstTime: boolean;

    roleList: any[] = [
        { name: 'Parent' },
        { name: 'Family' },
        { name: 'Sibling' },
        { name: 'Guardian' },
        { name: 'Teacher' },
        { name: 'Speech Therapist' },
        { name: 'Occupational Therapist' },
        { name: 'Physical Therapist' },
        { name: 'Nurse' },
        { name: 'Physician' },
        { name: 'Case Worker' }
    ]

    selected: string;

    private readonly onDestroy = new Subject<void>();

    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private profileService: ProfileService
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;
    }

    ionViewWillEnter() {
        this.firstTime = this.navParams.get('firstTime')
        this.profile$ = this.store.select<Profile>('profile');
        this.profile$.pipe(
          takeUntil(this.onDestroy),
          tap(profile => {
            this.profile = {
                displayName: profile.displayName || null,
                email: profile.email || null,
                role: profile.role || null
            };
            if (!this.currentProfile) {
              this.currentProfile = profile;
            }
            if (!this.firstTime) {
              this.selected = this.profile.role;
              this.roleList.forEach(role => {
                if (role.name == this.selected) {
                  this.selected = role;
                }
              })
            }
          })
        ).subscribe()
    }

    async updateProfile() {
        if (this.profile.displayName && this.profile.role) {
            this.error = false;
            if (this.profile.displayName !== this.currentProfile.displayName || this.profile.role !== this.currentProfile.role) {
                console.log('updating...');
                await this.profileService.updateProfile(this.uid, this.profile);
                await this.modalController.dismiss({
                    response: 'success'
                })
            } else {
                console.log('no update necessary');
                await this.modalController.dismiss({
                    response: 'success'
                })
            }
        } else {
            this.error = true;
        }
    }

    deleteUser() {
        this.modalController.dismiss({
            response: 'delete'
        });
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }

}
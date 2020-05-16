import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { HostListener } from '@angular/core';

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { ProfilePictureComponent } from './profile-picture/profile-picture.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';

import { Store } from 'src/store';
import { ModalController, ToastController, IonRouterOutlet, ActionSheetController, Platform } from '@ionic/angular';
import { EditProfileComponent } from './edit-profile/edit-profile.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, AfterViewInit {

  firstTime: boolean = false;
  open: boolean = false;

  data: any;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;

  profile: Profile;
  currentProfile: Profile;
  profileCopy: Profile;

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
  profileSub: Subscription;

  ios: boolean;
  android: boolean;
  desktop: boolean;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private authService: AuthService,
    private profileService: ProfileService,
    private modalController: ModalController,
    private toastController: ToastController,
    private router: Router,
    private routerOutlet: IonRouterOutlet,
    private actionSheetController: ActionSheetController,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    this.subscriptions = [
      this.profileSub
    ];
  }

  ngAfterViewInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.profile$.pipe(
      takeUntil(this.onDestroy),
      tap((profile:Profile) => {
        this.currentProfile = profile;
        if (this.currentProfile && !this.currentProfile.displayName && !this.firstTime) {
          this.firstTime = true;
          setTimeout(() => {
            this.editProfileModal(true);
          }, 1000)
        }
      })
    ).subscribe()
  }

  onFocus(ev) {
    if (!this.open) {
      this.editProfileModal(false);
    }
  }

  async profilePictureModal() {
    const modal = await this.modalController.create({
      component: ProfilePictureComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      componentProps: {
        'teamId': null,
      }
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentPictureUpdateToast();
      }
    });
    return await modal.present();
  }

  async presentPictureUpdateToast() {
    const toast = await this.toastController.create({
      message: 'Your profile picture was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  async presentProfileUpdateToast() {
    const toast = await this.toastController.create({
      message: 'Your profile was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  get uid() {
    return this.authService.user.uid;
  }

  onToggle(ev) {
    console.log(ev);
    if (this.profile.gcalSync) {
      console.log('turn on');
      if (!this.ios) {
        this.authService.linkGoogleAccount();
      } else if (this.ios) {
        this.authService.linkIosGoogleAccount();
      }
    } else if (!this.profile.gcalSync) {
      if (!this.ios) {
        this.authService.unlinkGoogleAccount();
      } else if (this.ios) {
        this.authService.unlinkIosGoogleAccount();
      }
      console.log('turn off')
    }
  }

  async editProfileModal(firstTime: boolean) {
    this.open = true;
    const modal = await this.modalController.create({
      component: EditProfileComponent,
      componentProps: {
        'firstTime': firstTime
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      backdropDismiss: !firstTime,
    });
    modal.onWillDismiss().then(data => {
      this.open = false;
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentProfileUpdateToast();
      }
      if (this.data.response == 'delete') {
        this.deleteUserModal();
      }
    });
    return await modal.present();
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Warning: Permanent Action',
      buttons: [{
        text: 'Delete',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          console.log('Delete clicked');
          this.presentDeleteUserToast();
          this.authService.deleteUser();
        }
      }, {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();
  }

  deleteUser() {
    return this.deleteUserModal();
  }

  async deleteUserModal() {
    const modal = await this.modalController.create({
      component: DeleteUserComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
      // componentProps: {
      //   'teamId': this.teamId,
      //   'groupId': this.groupId
      // }
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'delete') {
        this.presentActionSheet();
      }
    });
    await modal.present();
  }

  async presentDeleteUserToast() {
    const toast = await this.toastController.create({
      message: 'We are sorry to see you go! &#128075;',
      duration: 2000
    });
    toast.present();
  }

  showGcalHint() {
    console.log("Show hint here...")
  }

  ngOnDestroy() {
    this.onDestroy.next();
    this.subscriptions.forEach(sub => {
      if (sub) {
        sub.unsubscribe()
      }
    });
  }

}

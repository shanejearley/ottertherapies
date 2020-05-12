import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { HostListener } from '@angular/core';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { ProfilePictureComponent } from './profile-picture/profile-picture.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';

import { Store } from 'src/store';
import { ModalController, ToastController, IonRouterOutlet, ActionSheetController } from '@ionic/angular';
import { ComponentCanDeactivate } from 'src/app/shared/guards/pending-changes.guard';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, ComponentCanDeactivate {
  // @HostListener allows us to also guard against browser refresh, close, etc.
  @HostListener('window:beforeunload')
  canDeactivate(): Observable<boolean> | boolean {
    if (this.profile.displayName !== this.currentProfile.displayName || this.profile.role !== this.currentProfile.role) {
      return false;
    } else {
      return true;
    }
  }

  firstTime: boolean = false;
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
  roleList: any[] = [
    { name: 'Parent' },
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


  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private profileService: ProfileService,
    private modalController: ModalController,
    private toastController: ToastController,
    private router: Router,
    private routerOutlet: IonRouterOutlet,
    private actionSheetController: ActionSheetController
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.profile$.pipe(tap(profile => {
      if (profile) {
        this.profile = {
          uid: profile.uid || null,
          email: profile.email || null,
          displayName: profile.displayName || null,
          role: profile.role || null,
          lastTeam: profile.lastTeam || null,
          url: profile.url || null,
          fcmTokens: profile.fcmTokens || null,
          badge: profile.badge || null
        }
        if (!this.currentProfile) {
          this.currentProfile = profile;
        }
        if (!profile.displayName) {
          this.firstTime = true;
        } else {
          this.selected = this.profile.role;
          this.roleList.forEach(role => {
            if (role.name == this.selected) {
              this.selected = role;
            }
          })
        }
      }
    })).subscribe()
    this.subscriptions = [
      this.profileSub
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    // this.team$ = this.activatedRoute.params
    // .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub) {
        sub.unsubscribe()
      }
    });
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

  async updateProfile() {
    if (this.profile.displayName !== this.currentProfile.displayName || this.profile.role !== this.currentProfile.role) {
      console.log('updating...');
      this.currentProfile = null;
      await this.profileService.updateProfile(this.uid, this.profile);
    } else {
      console.log('no update necessary');
    }
    await this.presentProfileUpdateToast();
    if (this.firstTime) {
      this.firstTime = false;
      return this.router.navigate(['/Teams']);
    } else {
      return;
    }
  }

  onChange(ev) {
    console.log(ev);
    this.roleList.forEach(role => {
      console.log(role);
    })
  }

  deleteUser() {
    return this.deleteUserModal();
  }

}

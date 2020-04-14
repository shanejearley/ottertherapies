import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { ProfilePictureComponent } from './profile-picture/profile-picture.component';

import { Store } from 'src/store';
import { ModalController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  firstTime: boolean = false;
  edit: boolean = false;
  data: any;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  profile: Profile;
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


  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private profileService: ProfileService,
    private modalController: ModalController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.profile$.pipe(tap(profile => {
      if (profile && !profile.displayName) {
        this.firstTime = true;
        this.edit = true;
      } else if (profile) {
        this.profile = profile;
        console.log(this.profile.role);
        this.selected = this.profile.role;
        this.roleList.forEach(role => {
          if (role.name == this.selected) {
            this.selected = role;
          }
        })
      }
    })).subscribe()
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    // this.team$ = this.activatedRoute.params
    // .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async profilePictureModal() {
    const modal = await this.modalController.create({
      component: ProfilePictureComponent,
      // componentProps: {
      //   'teamId': this.teamId,
      //   'groupId': this.groupId
      // }
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
    this.edit = false;
    await this.profileService.updateProfile(this.uid, this.profile);
    return this.presentProfileUpdateToast();
  }

  onChange(ev) {
    console.log(ev);
    this.roleList.forEach(role => {
      console.log(role);
    })
  }

}

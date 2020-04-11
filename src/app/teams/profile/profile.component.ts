import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { ProfilePictureComponent } from '../../shared/components/profile-picture/profile-picture.component';

import { Store } from 'src/store';
import { ModalController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  data: any;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private modalController: ModalController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
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
        this.presentToast();
      }
    });
    return await modal.present();
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: 'Your profile picture was updated!',
      duration: 2000
    });
    toast.present();
  }

}

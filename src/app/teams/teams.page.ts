import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';

import { AuthService, User } from '../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../auth/shared/services/profile/profile.service';
import { CreateTeamComponent } from './create-team/create-team.component';

import { Store } from 'src/store';
import { TeamsService, Team } from '../shared/services/teams/teams.service';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.page.html',
  styleUrls: ['./teams.page.scss'],
})
export class TeamsPage implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  subscriptions: Subscription[] = [];
  //public teams: string;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private modalController: ModalController
    ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    this.subscriptions = [
      this.authService.auth$.subscribe(),
      this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    //this.teams = this.activatedRoute.snapshot.paramMap.get('id');
  }

  async createTeamModal() {
    const modal = await this.modalController.create({
      component: CreateTeamComponent
    });
    modal.onWillDismiss().then(data => {
      //this.data = data.data;
    });
    return await modal.present();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

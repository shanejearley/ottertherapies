import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';

import { AuthService, User } from '../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../auth/shared/services/profile/profile.service';

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
    private teamsService: TeamsService
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

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, IonRouterOutlet } from '@ionic/angular';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';

import { User } from '../../auth/shared/services/auth/auth.service';
import { Profile } from '../../auth/shared/services/profile/profile.service';
import { CreateTeamComponent } from './create-team/create-team.component';

import { Store } from 'src/store';
import { Team } from '../shared/services/teams/teams.service';
import { Pending, PendingService } from '../shared/services/pending/pending.service';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.page.html',
  styleUrls: ['./teams.page.scss'],
})
export class TeamsPage implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  pending$: Observable<Pending[]>;
  subscriptions: Subscription[] = [];

  constructor(
    private store: Store,
    private modalController: ModalController,
    private pendingService: PendingService,
    private router: Router,
    private routerOutlet: IonRouterOutlet
    ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    this.pending$ = this.store.select<Pending[]>('pending');
    this.subscriptions = [
      // this.authService.auth$.subscribe(),
      // this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    //this.teams = this.activatedRoute.snapshot.paramMap.get('id');
  }

  async createTeamModal() {
    const modal = await this.modalController.create({
      component: CreateTeamComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      //this.data = data.data;
    });
    return await modal.present();
  }

  async joinTeam(team) {
    await this.pendingService.joinTeam(team);
    return this.router.navigate(['/Teams', team.id]);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  goTo(route: string) {
    this.router.navigate([`../Teams/${route}`]);
  }

}

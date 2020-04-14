import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { User } from '../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { Group } from '../../shared/services/groups/groups.service';
import { Member, MembersService } from '../../shared/services/members/members.service';
import { EditTeamComponent } from './edit-team/edit-team.component';

import { Store } from 'src/store';

import { ModalController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  teamId: string;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  member$: Observable<Member>;
  memberStatus: string;
  data: any;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private membersService: MembersService,
    private teamsService: TeamsService,
    private modalController: ModalController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.members$ = this.store.select<Member[]>('members');
    this.profile$.pipe(tap(profile => {
      if (profile) {
        this.member$ = this.membersService.getMember(profile.uid);
        this.member$.pipe(tap(m => {
          if (m) {
            this.memberStatus = m.status;
          }
        })).subscribe()
      }
    })).subscribe()
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id)));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  goTo(route: string, id: string) {
    this.router.navigate([`../Teams/${this.teamId}/${route}/${id}`]);
  }

  async editTeamModal() {
    const modal = await this.modalController.create({
      component: EditTeamComponent,
      componentProps: {
        'teamId': this.teamId,
      }
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
      message: 'Your team was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

}

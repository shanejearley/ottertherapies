import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';
import { MembersService, Member } from '../../shared/services/members/members.service';

import { Store } from 'src/store';

import { DocumentScanner, DocumentScannerOptions } from '@ionic-native/document-scanner/ngx';

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

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private documentScanner: DocumentScanner
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.members$ = this.store.select<Member[]>('members');
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

  addMembers() {
    console.log("Adding member");
  }

  goTo(route: string, id:string) {
    this.router.navigate([`../Teams/${this.teamId}/${route}/${id}`]);
  }

}

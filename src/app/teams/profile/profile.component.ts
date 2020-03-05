import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';

import { Store } from 'src/store';

import { DocumentScanner, DocumentScannerOptions } from '@ionic-native/document-scanner/ngx';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private documentScanner: DocumentScanner
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    //this.teams$ = this.store.select<Team[]>('teams');
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

  scanDoc() {
    let opts: DocumentScannerOptions = {};
    this.documentScanner.scanDoc(opts)
      .then((res: string) => {
        console.log(res);
      })
      .catch((error: any) => console.error(error));
  }

}

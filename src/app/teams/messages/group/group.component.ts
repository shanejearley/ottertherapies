import { Component, OnInit, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firestore } from 'firebase/app';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore'
import {IonContent} from '@ionic/angular';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { GroupsService, Group, Message } from '../../../shared/services/groups/groups.service';
import { MembersService, Member } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';

import { DocumentScanner, DocumentScannerOptions } from '@ionic-native/document-scanner/ngx';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
})
export class GroupComponent implements OnInit {
  @ViewChild(IonContent, {static: false}) contentArea: IonContent;
  @ViewChildren('messages') messages: QueryList<any>;

  private messagesCol: AngularFirestoreCollection<Message>;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  group$: Observable<Group>;
  message: Message;
  groupId: string;
  teamId: string;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  date: Date;
  time: number;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private groupsService: GroupsService,
    private documentScanner: DocumentScanner,
    private db: AngularFirestore
  ) {}
  scrollToBottom() {
    setTimeout(() => {
      if (this.contentArea && this.contentArea.scrollToBottom) {
        this.contentArea.scrollToBottom(500);
      }
    }, 500);
  }

  scrollOnFocus() {
    setTimeout(() => {
      this.scrollToBottom();
    }, 250)
  }

  sendMessage() {
    this.message.uid = this.uid;
    this.message.timestamp = firestore.FieldValue.serverTimestamp();
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/groups/${this.groupId}/messages`);
    this.messagesCol.add(this.message);
    this.message = {
      body: '',
      id: null,
      uid: null,
      timestamp: null,
      profile: null
    };
    this.scrollToBottom();
  }

  get uid() {
    return this.authService.user.uid;
  }

  public trackFn(index, item) {
    return item ? item.id : undefined;
  }

  ionViewDidEnter(){
    setTimeout(() => {
      this.scrollToBottom();
    })
    setTimeout(() => {
      this.scrollToBottom();
    }, 1500)
  }

  ngOnInit() {
    this.date = new Date();
    this.time = this.date.getTime();
    this.message = {
      body: '',
      id: null,
      uid: null,
      timestamp: null,
      profile: null
    };
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.members$ = this.store.select<Member[]>('members');
    this.group$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.groupId = param.groupId }),
        switchMap(param => this.groupsService.getGroup(param.groupId))
      );
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        tap(param => { console.log(param.id) }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

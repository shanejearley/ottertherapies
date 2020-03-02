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
import { MembersService, Member, Message } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';

@Component({
  selector: 'app-direct',
  templateUrl: './direct.component.html',
  styleUrls: ['./direct.component.scss'],
})
export class DirectComponent implements OnInit {
  @ViewChild(IonContent, {static: false}) contentArea: IonContent;
  @ViewChildren('messages') messages: QueryList<any>;

  private messagesCol: AngularFirestoreCollection<Message>;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  members$: Observable<Member[]>;
  member$: Observable<Member>;
  message: Message;
  directId: string;
  pathId: string;
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
    private teamsService: TeamsService,
    private membersService: MembersService,
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
    this.pathId = this.uid < this.directId ? this.uid + this.directId : this.directId + this.uid;
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/direct/${this.pathId}/messages`);
    console.log(this.message);
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
    this.members$ = this.store.select<Member[]>('members');
    this.member$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.directId = param.directId }),
        switchMap(param => this.membersService.getMember(param.directId))
      );
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firestore } from 'firebase/app';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore'
import { IonContent, IonList } from '@ionic/angular';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { MembersService, Member, Message, Direct } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';

@Component({
  selector: 'app-direct',
  templateUrl: './direct.component.html',
  styleUrls: ['./direct.component.scss'],
})
export class DirectComponent implements OnInit {
  finished = false;
  @ViewChild(IonContent, { static: false }) contentArea: IonContent;
  @ViewChild(IonList, { read: ElementRef, static: false }) scroll: ElementRef;
  private mutationObserver: MutationObserver;
  private messagesCol: AngularFirestoreCollection<Message>;
  private directDoc: AngularFirestoreDocument<Direct>;
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
  ) { }

  ngAfterViewInit() {
    setTimeout(() => {
      this.scrollToBottom(0);
    }, 250)
    this.membersService.checkLastMessage(this.directId);
    this.mutationObserver = new MutationObserver((mutations) => {
      this.scrollToBottom(500);
      this.membersService.checkLastMessage(this.directId);
    })
    this.mutationObserver.observe(this.scroll.nativeElement, {
      childList: true
    });
  }

  scrollToBottom(duration) {
    if (this.contentArea && this.contentArea.scrollToBottom) {
      setTimeout(() => {
        this.contentArea.scrollToBottom(duration);
      }, 250)
    }
  }

  scrollOnFocus() {
    setTimeout(() => {
      this.scrollToBottom(500);
    }, 500)  
  }

  sendMessage() {
    this.message.uid = this.uid;
    this.message.timestamp = firestore.FieldValue.serverTimestamp();
    this.pathId = this.uid < this.directId ? this.uid + this.directId : this.directId + this.uid;
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/direct/${this.pathId}/messages`);
    this.directDoc = this.db.doc<Direct>(`teams/${this.teamId}/direct/${this.pathId}`);
    this.messagesCol.add(this.message).then((messageRef) => {
      this.directDoc.update({
        lastMessage: this.message.body,
        lastMessageId: messageRef.id,
        lastMessageUid: this.message.uid
      }).then(() => {
        this.message = {
          body: '',
          id: null,
          uid: null,
          timestamp: null,
          profile: null
        };
      })
    });
  }

  get uid() {
    return this.authService.user.uid;
  }

  public trackFn(index, item) {
    return item ? item.id : undefined;
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

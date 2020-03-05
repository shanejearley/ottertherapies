import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { firestore } from 'firebase/app';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore'
import { IonContent, IonList } from '@ionic/angular';

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
  @ViewChild(IonContent, { static: false }) contentArea: IonContent;
  @ViewChild(IonList, { read: ElementRef, static: false }) scroll: ElementRef;
  private mutationObserver: MutationObserver;
  private messagesCol: AngularFirestoreCollection<Message>;
  private groupDoc: AngularFirestoreDocument<Group>;
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
    private router: Router,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private groupsService: GroupsService,
    private documentScanner: DocumentScanner,
    private db: AngularFirestore
  ) {}

  scrollToBottom(duration) {
    if (this.contentArea && this.contentArea.scrollToBottom) {
      this.contentArea.scrollToBottom(duration);
    }
  }

  scrollOnFocus() {
    this.scrollToBottom(500);
  }

  sendMessage() {
    this.message.uid = this.uid;
    this.message.timestamp = firestore.FieldValue.serverTimestamp();
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/groups/${this.groupId}/messages`);
    this.groupDoc = this.db.doc<Group>(`teams/${this.teamId}/groups/${this.groupId}`);
    this.messagesCol.add(this.message).then((messageRef) => {
      this.groupDoc.update({
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
    this.router.events.subscribe(val => {
      if (val instanceof NavigationEnd) {
        this.scrollToBottom(0);
        this.mutationObserver = new MutationObserver((mutations) => {
          console.log(mutations);
          this.scrollToBottom(500);
        })
        this.mutationObserver.observe(this.scroll.nativeElement, {
          childList: true
        });
      }
    });
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
    this.mutationObserver.disconnect();
  }

}

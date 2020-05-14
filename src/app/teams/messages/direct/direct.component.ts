import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, Platform } from '@ionic/angular';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { MembersService, Member } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';

@Component({
  selector: 'app-direct',
  templateUrl: './direct.component.html',
  styleUrls: ['./direct.component.scss'],
})
export class DirectComponent implements OnInit {
  finished = false;
  @ViewChild(IonContent) contentArea: IonContent;
  @ViewChild(IonList, { read: ElementRef }) scroll: ElementRef;
  ios: boolean;
  android: boolean;
  desktop: boolean;
  private mutationObserver: MutationObserver;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  members$: Observable<Member[]>;
  member$: Observable<Member>;
  newBody: string;
  directId: string;
  pathId: string;
  teamId: string;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  date: Date;
  time: number;
  memberSub: Subscription;
  watch: boolean;
  member: Member;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private membersService: MembersService,
    private platform: Platform
  ) { }

  ngAfterViewInit() {
    this.watch = true;
    this.subscriptions = [this.memberSub]
    this.memberSub = this.member$.pipe(tap(member => {
      if (member && member.messages.length) {
        this.member = member;
        if (this.watch) {
          this.scrollToBottom(0);
          this.checkUnread();
          this.mutationObserver = new MutationObserver((mutations) => {
            this.scrollToBottom(500);
            this.checkUnread();
          })
          this.mutationObserver.observe(this.scroll.nativeElement, {
            childList: true
          });
        }
      }
    })).subscribe()
  }

  checkUnread() {
    if (this.member.unread && this.member.unread.unreadMessages > 0) {
      this.membersService.checkLastMessage(this.directId);
    }
    setTimeout(() => {
      if (this.member.unread && this.member.unread.unreadMessages > 0) {
        this.membersService.checkLastMessage(this.directId);
      }
    }, 5000)
  }

  scrollToBottom(duration) {
    if (this.contentArea && this.contentArea.scrollToBottom) {
      setTimeout(() => {
        this.contentArea.scrollToBottom(duration);
      })
    }
  }

  scrollOnFocus() {
    setTimeout(() => {
      this.scrollToBottom(500);
    }, 750)
  }

  checkSendMessage() {
    if (this.desktop) {
      this.sendMessage();
    }
  }

  sendMessage() {
    this.membersService.addMessage(this.newBody, this.directId);
    this.newBody = '';
  }

  onKeydown(event) {
    if (this.desktop) {
      event.preventDefault();
    }
  }

  get uid() {
    return this.authService.user.uid;
  }

  public trackFn(index, item) {
    return item ? item.id : undefined;
  }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    this.date = new Date();
    this.time = this.date.getTime();
    this.newBody = '';
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
    this.watch = false;
    this.subscriptions.forEach(sub => {
      if (sub) {
        sub.unsubscribe()
      }
    });
  }

}

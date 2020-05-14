import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, IonRouterOutlet, Platform } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { GroupsService, Group, Message } from '../../../shared/services/groups/groups.service';
import { Member } from '../../../shared/services/members/members.service';
import { EditGroupComponent } from '../../../shared/components/edit-group/edit-group.component';

import { Store } from 'src/store';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
})
export class GroupComponent implements OnInit {
  @ViewChild(IonContent) contentArea: IonContent;
  @ViewChild(IonList, { read: ElementRef }) scroll: ElementRef;
  ios: boolean;
  android: boolean;
  desktop: boolean;
  private mutationObserver: MutationObserver;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  group$: Observable<Group>;
  newBody: string;
  groupId: string;
  teamId: string;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  date: Date;
  time: number;
  data: any;
  messages: Message[];
  group: Group;
  groupSub: Subscription;
  watch: boolean;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private groupsService: GroupsService,
    public modalController: ModalController,
    public toastController: ToastController,
    private platform: Platform,
    private routerOutlet: IonRouterOutlet
  ) { }

  ngAfterViewInit() {
    this.watch = true;
    this.groupSub = this.group$.pipe(tap(group => {
      if (group && group.messages.length) {
        console.log('update!', group.messages);
        this.group = group;
        this.scrollToBottom(0);
        if (this.watch) {
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
    if (this.group.unread && this.group.unread.unreadMessages > 0) {
      this.groupsService.checkLastMessage(this.groupId);
    }
    setTimeout(() => {
      if (this.group.unread && this.group.unread.unreadMessages > 0) {
        this.groupsService.checkLastMessage(this.groupId);
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

  onKeydown(event) {
    if (this.desktop) {
      event.preventDefault();
    }
  }

  sendMessage() {
    this.groupsService.addMessage(this.newBody, this.groupId);
    this.newBody = '';
  }

  get uid() {
    return this.authService.user.uid;
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
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  async editGroupModal() {
    const modal = await this.modalController.create({
      component: EditGroupComponent,
      componentProps: {
        'teamId': this.teamId,
        'groupId': this.groupId
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
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
      message: 'Your group was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  ngOnDestroy() {
    this.watch = false;
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.groupSub && !this.groupSub.closed) {
      this.groupSub.unsubscribe();
    }
  }

}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { User } from '../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { Group } from '../../shared/services/groups/groups.service';
import { Member } from '../../shared/services/members/members.service';
import { CreateGroupComponent } from '../../shared/components/create-group/create-group.component';

import { Store } from 'src/store';
import { ModalController, ToastController, IonRouterOutlet, Platform } from '@ionic/angular';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
})
export class MessagesComponent implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  teamId: string;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  data: any;
  desktop: boolean;
  ios: boolean;
  android: boolean;
  capacitor: boolean;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private teamsService: TeamsService,
    public modalController: ModalController,
    public toastController: ToastController,
    private routerOutlet: IonRouterOutlet,
    private platform: Platform
  ) { }

  public trackFn(index, item) {
    return item ? item.id : undefined;
  }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios');
      this.android = this.platform.is('android');
      this.capacitor = this.platform.is('capacitor');
    })
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

  goTo(route: string, id: string) {
    this.router.navigate([`../Teams/${this.teamId}/Messages/${route}/${id}`]);
  }

  async createGroupModal() {
    const modal = await this.modalController.create({
      component: CreateGroupComponent,
      componentProps: {
        'teamId': this.teamId,
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response !== 'dismissed' && this.data.response !== 'error') {
        this.presentCreatingToast();
        setTimeout(() => {
          this.presentCreateToast();
        }, 2000)
        setTimeout(() => {
          return this.router.navigate([`../Teams/${this.teamId}/Messages/Group/${this.data.response}`]);
        }, 4000)
      }
    });
    return await modal.present();
  }

  async presentCreatingToast() {
    const toast = await this.toastController.create({
      message: 'Creating your group...',
      duration: 2000
    });
    toast.present();
  }

  async presentCreateToast() {
    const toast = await this.toastController.create({
      message: 'Your group was created!',
      duration: 2000
    });
    toast.present();
  }

}

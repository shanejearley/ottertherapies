import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, IonRouterOutlet, Platform } from '@ionic/angular';

import {
  Plugins,
  PushNotification,
  PushNotificationToken,
  PushNotificationActionPerformed
} from '@capacitor/core';

const { PushNotifications } = Plugins;

import { Observable, Subscription } from 'rxjs';
import { map, reduce } from 'rxjs/operators';

import { User, AuthService } from '../../auth/shared/services/auth/auth.service';
import { Profile, ProfileService } from '../../auth/shared/services/profile/profile.service';
import { CreateTeamComponent } from './create-team/create-team.component';

import { Store } from 'src/store';
import { Team } from '../shared/services/teams/teams.service';
import { Pending, PendingService } from '../shared/services/pending/pending.service';
import { NotificationsService } from '../notifications.service';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.page.html',
  styleUrls: ['./teams.page.scss'],
})
export class TeamsPage implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  pending$: Observable<Pending[]>;
  subscriptions: Subscription[] = [];
  desktop: boolean;
  android: boolean;
  ios: boolean;

  constructor(
    private store: Store,
    private modalController: ModalController,
    private pendingService: PendingService,
    private router: Router,
    private routerOutlet: IonRouterOutlet,
    private notificationsService: NotificationsService,
    private profileService: ProfileService,
    private platform: Platform
  ) { }

  get currentProfile() {
    return this.profileService.currentProfile;
  }

  ngOnInit() {
    this.notificationsService.init();
    this.notificationsService.requestPermission();
    this.platform.ready().then(() => {
      if (this.platform.is('desktop')) {
        this.desktop = true;
      } else if (this.platform.is('ios')) {
        this.ios = true;
      } else if (this.platform.is('android')) {
        this.android = true;
      }
      if (this.ios || this.android) {
        PushNotifications.requestPermission().then(result => {
          if (result.granted) {
            // Register with Apple / Google to receive push via APNS/FCM
            PushNotifications.register();
          } else {
            // Show some error
          }
        });
        PushNotifications.addListener('registration',
          (token: PushNotificationToken) => {
            console.log('Push registration success, token: ' + token.value);
            this.notificationsService.saveToken(this.currentProfile, token.value);
          }
        );
    
        PushNotifications.addListener('registrationError',
          (error: any) => {
            console.log('Error on registration: ' + JSON.stringify(error))
          }
        );
    
        PushNotifications.addListener('pushNotificationReceived',
          (notification: PushNotification) => {
            console.log('Push received: ' + JSON.stringify(notification))
          }
        );
    
        PushNotifications.addListener('pushNotificationActionPerformed',
          (notification: PushNotificationActionPerformed) => {
            console.log('Push action performed: ' + JSON.stringify(notification))
          }
        );
      }
    });
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    this.pending$ = this.store.select<Pending[]>('pending');

    this.subscriptions = [
      // this.authService.auth$.subscribe(),
      // this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    //this.teams = this.activatedRoute.snapshot.paramMap.get('id');
  }

  async createTeamModal() {
    const modal = await this.modalController.create({
      component: CreateTeamComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      //this.data = data.data;
    });
    return await modal.present();
  }

  async joinTeam(team) {
    await this.pendingService.joinTeam(team);
    return this.router.navigate(['/Teams', team.id]);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  goTo(route: string) {
    this.router.navigate([`../Teams/${route}`]);
  }

}

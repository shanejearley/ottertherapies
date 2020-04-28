import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, IonRouterOutlet } from '@ionic/angular';

import {
  Plugins,
  PushNotification,
  PushNotificationToken,
  PushNotificationActionPerformed
} from '@capacitor/core';

const { PushNotifications } = Plugins;

import { Observable, Subscription } from 'rxjs';
import { map, reduce } from 'rxjs/operators';

import { User } from '../../auth/shared/services/auth/auth.service';
import { Profile } from '../../auth/shared/services/profile/profile.service';
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

  constructor(
    private store: Store,
    private modalController: ModalController,
    private pendingService: PendingService,
    private router: Router,
    private routerOutlet: IonRouterOutlet,
    private notificationsService: NotificationsService
  ) { }

  ngOnInit() {
    console.log('Initializing Teams Page');
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    this.pending$ = this.store.select<Pending[]>('pending');
    // Request permission to use push notifications
    // iOS will prompt user and return if they granted permission or not
    // Android will just grant without prompting
    this.notificationsService.init();
    this.notificationsService.requestPermission();
    PushNotifications.requestPermission().then(result => {
      if (result.granted) {
        // Register with Apple / Google to receive push via APNS/FCM
        PushNotifications.register();
      } else {
        // Show some error
      }
    });
    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration',
      (token: PushNotificationToken) => {
        alert('Push registration success, token: ' + token.value);
      }
    );

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError',
      (error: any) => {
        alert('Error on registration: ' + JSON.stringify(error));
      }
    );

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotification) => {
        alert('Push received: ' + JSON.stringify(notification));
      }
    );

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed',
      (notification: PushNotificationActionPerformed) => {
        alert('Push action performed: ' + JSON.stringify(notification));
      }
    );

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

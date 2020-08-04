import { Component, OnInit, Input, Output, HostListener, EventEmitter } from '@angular/core';
import { Router, GuardsCheckEnd } from '@angular/router';
import { ModalController, IonRouterOutlet, Platform, PopoverController, ToastController, ActionSheetController } from '@ionic/angular';

import {
  Plugins,
  PushNotification,
  PushNotificationToken,
  PushNotificationActionPerformed
} from '@capacitor/core';

const { PushNotifications } = Plugins;

import { Observable, Subscription, Subject } from 'rxjs';

import { User, AuthService } from '../../auth/shared/services/auth/auth.service';
import { Profile, ProfileService } from '../../auth/shared/services/profile/profile.service';
import { CreateTeamComponent } from './create-team/create-team.component';

import { Store } from 'src/store';
import { Team } from '../shared/services/teams/teams.service';
import { Pending, PendingService } from '../shared/services/pending/pending.service';
import { NotificationsService } from '../notifications.service';
import { MobileMenuComponent } from '../shared/components/mobile-menu/mobile-menu.component';
import { DarkService } from '../shared/services/dark/dark.service';
import { takeUntil, tap } from 'rxjs/operators';
import { EditProfileComponent } from './profile/edit-profile/edit-profile.component';
import { DeleteUserComponent } from './profile/delete-user/delete-user.component';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.page.html',
  styleUrls: ['./teams.page.scss'],
})
export class TeamsPage implements OnInit {
  root: string;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  pending$: Observable<Pending[]>;

  desktop: boolean;
  android: boolean;
  ios: boolean;
  capacitor: boolean;
  mobile: boolean;

  firstTime: boolean = true;

  open: boolean = false;
  data: any;

  dark: boolean;
  dark$: Observable<boolean>;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private modalController: ModalController,
    private pendingService: PendingService,
    private router: Router,
    private routerOutlet: IonRouterOutlet,
    private notificationsService: NotificationsService,
    private profileService: ProfileService,
    private platform: Platform,
    private popoverController: PopoverController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private authService: AuthService
  ) { }

  get currentProfile() {
    return this.profileService.currentProfile;
  }

  async presentPopover(ev) {
    console.log(this.dark);
    const popover = await this.popoverController.create({
      component: MobileMenuComponent,
      componentProps: {
        'root': this.root,
        'dark': this.dark
      },
      event: ev,
      translucent: true,
      cssClass: 'popover-class'
    });

    popover.onWillDismiss().then(data => {
      if (data) {
        console.log(data.data.response);
      }
    });
    return await popover.present();
  }

  async editProfileModal(firstTime: boolean) {
    this.open = true;
    const modal = await this.modalController.create({
      component: EditProfileComponent,
      componentProps: {
        'firstTime': firstTime
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      backdropDismiss: !firstTime,
    });
    modal.onWillDismiss().then(data => {
      this.open = false;
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentProfileUpdateToast();
      }
      if (this.data.response == 'delete') {
        this.deleteUserModal();
      }
    });
    return await modal.present();
  }

  async presentProfileUpdateToast() {
    const toast = await this.toastController.create({
      message: 'Your profile was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  async deleteUserModal() {
    const modal = await this.modalController.create({
      component: DeleteUserComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'delete') {
        this.presentActionSheet();
      }
    });
    await modal.present();
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Warning: Permanent Action',
      buttons: [{
        text: 'Delete',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          console.log('Delete clicked');
          this.presentDeleteUserToast();
          this.authService.deleteUser();
        }
      }, {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();
  }

  async presentDeleteUserToast() {
    const toast = await this.toastController.create({
      message: 'We are sorry to see you go! &#128075;',
      duration: 2000
    });
    toast.present();
  }

  ngOnInit() {
    this.dark$ = this.store.select('dark');
    this.dark$.pipe(
      takeUntil(this.onDestroy),
      tap(dark => {
        this.dark = dark;
      })
    ).subscribe();

    this.profile$ = this.store.select('profile');
    this.profile$.pipe(
      takeUntil(this.onDestroy),
      tap(profile => {
        if (profile && !profile.displayName) {
          if (this.firstTime) {
            this.editProfileModal(this.firstTime);
            this.firstTime = false;
          }
        }
      })
    ).subscribe()

    this.router.events.subscribe(val => {
      if (val instanceof GuardsCheckEnd) {
        if (val.state.root.firstChild.url[0]) {
          this.root = val.state.root.firstChild.url[0].path;
        }
        if (!val.state.root.firstChild.url[0]) {
          this.root = null;
        }
      }
    })

    this.notificationsService.init();
    this.notificationsService.requestPermission();

    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios');
      this.android = this.platform.is('android');
      this.capacitor = this.platform.is('capacitor');
      this.mobile = this.platform.is('mobile');
      if (this.ios && this.capacitor || this.android) {
        PushNotifications.requestPermission().then(result => {
          if (result.granted) {
            // Register with Apple / Google to receive push via APNS/FCM
            PushNotifications.register();
          } else {
            console.log(result);
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

  goTo(route: string) {
    this.router.navigate([`../Teams/${route}`]);
  }

  public trackFn(index, item) {
    return item.id;
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators'

import { CreateEventComponent } from './create-event/create-event.component';
import { EditEventComponent } from './edit-event/edit-event.component';
import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';
import { Event, EventsService } from '../../shared/services/events/events.service';

import { Store } from 'src/store';

import { CalendarComponentOptions } from 'ion2-calendar';
import moment from 'moment';
import { ModalController, ToastController, IonRouterOutlet, Platform } from '@ionic/angular';

export interface DayConfig {
  date: Date;
  marked?: boolean;
  disable?: boolean;
  title?: string;
  subTitle?: string;
  cssClass?: string;
}

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss'],
})
export class EventsComponent implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  events$: Observable<Event[]>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  public teamId: string;
  public data: any;
  today = moment().startOf('day').format('ll');
  date = moment().startOf('day').format('ll');
  month = moment().startOf('day').month();
  today$: Observable<Event[]>;
  type: 'string';
  _disableWeeks: number[] = [];
  eventsSource: DayConfig[] = [];
  options: CalendarComponentOptions = {
    from: new Date(1970, 1, 1),
    disableWeeks: [...this._disableWeeks],
    daysConfig: this.eventsSource
  };
  personal: boolean = false;

  desktop: boolean;
  ios: boolean;
  android: boolean;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private eventsService: EventsService,
    private modalController: ModalController,
    private toastController: ToastController,
    private routerOutlet: IonRouterOutlet,
    private platform: Platform
  ) { }

  dayChange($event) {
    if ($event.month() !== this.month) {
      this.eventsService.eventsObservable(this.uid, this.teamId, $event._d).subscribe();
      this.date = $event.format('ll');
      this.month = $event.month();
      this.today$ = this.eventsService.getToday(this.date);
      //addevents
    } else {
      this.date = $event.format('ll');
      this.today$ = this.eventsService.getToday(this.date);
    }
  }

  segmentChanged(ev) {
    if (ev && ev.detail.value === 'yours') {
      this.personal = true;
      this.configCalendar();
    } else if (ev && ev.detail.value === 'all') {
      this.personal = false;
      this.configCalendar();
    }
  }

  monthChange($event) {
    this.eventsService.eventsObservable(this.uid, this.teamId, $event.newMonth.dateObj).subscribe();
    this.month = $event.newMonth.months;
  }

  get uid() {
    return this.authService.user.uid;
  }

  _changeColors(color: string) {
    this.options = {
      ...this.options,
      color
    }
  }

  async createEventModal() {
    const modal = await this.modalController.create({
      component: CreateEventComponent,
      componentProps: {
        'teamId': this.teamId,
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentCreateToast();
      }
    });
    return await modal.present();
  }

  async editEventModal(eventId) {
    const modal = await this.modalController.create({
      component: EditEventComponent,
      componentProps: {
        'teamId': this.teamId,
        'eventId': eventId
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentUpdateToast();
      }
    });
    return await modal.present();
  }

  async presentCreateToast() {
    const toast = await this.toastController.create({
      message: 'Your event was created!',
      duration: 2000
    });
    toast.present();
  }

  async presentUpdateToast() {
    const toast = await this.toastController.create({
      message: 'Your event was updated!',
      duration: 2000
    });
    toast.present();
  }

  configCalendar() {
    this.events$.pipe(map(events => {
      if (events) {
        events.forEach(e => {
          if (this.personal && e.members[this.uid] || !this.personal) {
            if (moment(e.startTime.toDate()).startOf('day').format('ll') == this.date) {
              console.log(e);
              this.eventsSource.push({
                date: e.startTime.toDate(),
                marked: true,
                subTitle: '•',
                cssClass: 'dot && on-selected'
              });
            } else {
              this.eventsSource.push({
                date: e.startTime.toDate(),
                marked: false,
                subTitle: '•',
                cssClass: 'dot'
              });
            }
          }
        })
        this.options = {
          from: new Date(1970, 1, 1),
          disableWeeks: [...this._disableWeeks],
          daysConfig: this.eventsSource
        };
      }
    })).subscribe()
  }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.events$ = this.store.select<Event[]>('events');
    this.today$ = this.eventsService.getToday(this.date);
    this.configCalendar();
    //this.teams$ = this.store.select<Team[]>('teams');
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

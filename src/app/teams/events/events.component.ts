import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import firebase from 'firebase/app';

import { Observable, Subject, merge, combineLatest, concat, of, observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, map, tap, takeUntil, mapTo, take, filter } from 'rxjs/operators'

import { CreateEventComponent } from './create-event/create-event.component';
import { EditEventComponent } from './edit-event/edit-event.component';
import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { Group } from '../../shared/services/groups/groups.service';
import { Event, EventsService } from '../../shared/services/events/events.service';

import { Store } from 'src/store';

import { CalendarComponentOptions } from 'ion2-calendar';
import moment from 'moment';
import { ModalController, ToastController, IonRouterOutlet, Platform } from '@ionic/angular';

import { DateAdapter } from '@rschedule/core';
import { Rule, RuleOption } from '../../rschedule';
import { Member } from 'src/app/shared/services/members/members.service';

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
  uid: string;

  dark$: Observable<boolean>;

  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;

  events$: Observable<Event[]>;
  recurringEvents$: Observable<Event[]>;
  combinedEvents$: Observable<Event[]>;
  today$: Observable<Event[]>;
  removedEvents: Event[] = [];

  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  public teamId: string;
  public data: any;
  today = moment().startOf('day').format('ll');
  date = moment().startOf('day').format('ll');
  month = moment().startOf('day').month() + 1;
  type: 'string';
  _disableWeeks: number[] = [];
  eventsSource: DayConfig[] = [];
  options: CalendarComponentOptions = {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    from: new Date(1970, 1, 1),
    disableWeeks: [...this._disableWeeks]
  };
  personal: boolean = false;
  personalEvents: Event[];

  desktop: boolean;
  ios: boolean;
  android: boolean;
  capacitor: boolean;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private eventsService: EventsService,
    private modalController: ModalController,
    private toastController: ToastController,
    private routerOutlet: IonRouterOutlet,
    private platform: Platform
  ) { }

  dayChange($event) {
    console.log($event.month() + 1)
    if ($event.month() + 1 !== this.month) {
      this.month = $event.month() + 1;
      this.eventsService.eventsObservable(this.uid, this.teamId, $event._d).subscribe();
      this.date = $event.format('ll');
      this.today$ = this.getToday(this.date);
    } else {
      this.date = $event.format('ll');
      this.today$ = this.getToday(this.date);
    }
  }

  segmentChanged(ev) {
    if (ev && ev.detail.value === 'yours') {
      this.personal = true;
      setTimeout(() => {
        this.configCalendar();
        this.today$ = this.getToday(this.date);
      }, 250)
    } else if (ev && ev.detail.value === 'all') {
      this.personal = false;
      setTimeout(() => {
        this.configCalendar();
        this.today$ = this.getToday(this.date);
      }, 250)
    }
  }

  monthChange($event) {
    console.log($event)
    this.month = $event.newMonth.months;
    this.date = moment($event.newMonth.dateObj).format('ll')
    this.eventsService.eventsObservable(this.uid, this.teamId, $event.newMonth.dateObj).subscribe();
    this.configCalendar();
    this.today$ = this.getToday(this.date);
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
        'date': this.date
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

  async editEventModal(event: Event) {
    const modal = await this.modalController.create({
      component: EditEventComponent,
      componentProps: {
        'teamId': this.teamId,
        'date': this.date,
        'event': event
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentUpdateToast();
        this.configCalendar();
        this.today$ = this.getToday(this.date);
      }
      if (this.data.response == 'deleted') {
        this.removedEvents.push(event);
        this.configCalendar();
        this.today$ = this.getToday(this.date);
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
    this.eventsSource = [];
    this.combinedEvents$.pipe(
      filter(Boolean),
      takeUntil(this.onDestroy),
      map((events: Event[]) => {
        if (this.personal) {
          this.personalEvents = events.filter((ev: Event) => ev.members.find(member => member.uid === this.uid));
          this.personalEvents.forEach(e => {
            this.eventsSource.push({
              date: e.startTime.toDate(),
              marked: moment(e.startTime.toDate()).startOf('day').format('ll') == this.date ? true : false,
              subTitle: '???',
              cssClass: moment(e.startTime.toDate()).startOf('day').format('ll') == this.date ? 'dot && on-selected' : 'dot'
            });
          })
        } else {
          events.forEach(e => {
            this.eventsSource.push({
              date: e.startTime.toDate(),
              marked: moment(e.startTime.toDate()).startOf('day').format('ll') == this.date ? true : false,
              subTitle: '???',
              cssClass: moment(e.startTime.toDate()).startOf('day').format('ll') == this.date ? 'dot && on-selected' : 'dot'
            });
          })
        }
        this.options = {
          daysConfig: this.eventsSource,
          ...this.options
        };
      })
    ).subscribe()
  }

  async ngOnInit() {
    this.uid = (await this.authService.user).uid;

    this.dark$ = this.store.select('dark');

    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios');
      this.android = this.platform.is('android');
      this.capacitor = this.platform.is('capacitor');
    })
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');

    this.events$ = this.store.select<Event[]>('events');
    this.recurringEvents$ = this.store.select<Event[]>('recurringEvents');
    this.combinedEvents$ = combineLatest(this.events$, this.recurringEvents$)
      .pipe(
        takeUntil(this.onDestroy),
        filter(Boolean),
        map(([events, recurringEvents]) => events && recurringEvents ? [...events, ...recurringEvents] : events ? events : recurringEvents),
        switchMap((allEvents: Event[]) => allEvents ? this.getInstances(allEvents) : of(allEvents)),
        switchMap((allEvents: Event[]) => allEvents ? this.removeInstances(allEvents) : of(allEvents))
      );

    this.today$ = this.getToday(this.date);
    this.configCalendar();
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  getToday(day) {
    return this.combinedEvents$
      .pipe(
        filter(Boolean),
        map((events: Event[]) => this.personal ? events.filter((event: Event) => event.members.find(member => member.uid === this.uid) && moment(event.startTime.toDate()).startOf('day').format('ll') == day) : events.filter((event: Event) => moment(event.startTime.toDate()).startOf('day').format('ll') == day)))
  }

  getInstances(allEvents: Event[]) {
    allEvents.forEach(event => {
      if (event.recurrence !== 'once') {

        const weekdays: RuleOption.ByDayOfWeek[] = ['MO', 'TU', 'WE', 'TH', 'FR']
        const selectDays: DateAdapter.Weekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
        const weekday: DateAdapter.Weekday = selectDays[event.startTime.toDate().getDay()];
        const weekNumber = event.recurrence === 'monthly-last' ? -1 : Math.ceil(event.startTime.toDate().getDate() / 7);
        const monthlyDay: RuleOption.ByDayOfWeek[] = [[weekday, weekNumber]];
        const frequency = event.recurrence === 'daily' ? 'DAILY' : event.recurrence === 'weekly' ? 'WEEKLY' : event.recurrence === 'monthly' || event.recurrence === 'monthly-last' ? 'MONTHLY' : event.recurrence === 'annually' ? 'YEARLY' : event.recurrence === 'weekdays' ? 'DAILY' : null;

        const rule = event.recurrence === 'weekdays' ? new Rule({
          frequency: frequency,
          byDayOfWeek: weekdays,
          start: event.startTime.toDate(),
          end: event.until ? event.until.toDate() : moment(this.date).endOf('month').add('months', 1).toDate()
        }) : event.recurrence === 'monthly' || event.recurrence === 'monthly-last' ? new Rule({
          frequency: frequency,
          byDayOfWeek: monthlyDay,
          start: event.startTime.toDate(),
          end: event.until ? event.until.toDate() : moment(this.date).endOf('month').add('months', 1).toDate()
        }) : new Rule({
          frequency: frequency,
          start: event.startTime.toDate(),
          end: event.until ? event.until.toDate() : moment(this.date).endOf('month').add('months', 1).toDate()
        });

        const existingInstances = allEvents.filter((ev => ev.recurrenceId === event.id));
        if (existingInstances.length) {
          existingInstances.forEach(e => {
            const removeEvIndex = allEvents.indexOf(e);
            allEvents.splice(removeEvIndex, 1);
          })
        } else {
          console.log('INSTANCES DO NOT EXIST YET')
        }

        for (const { date } of rule.occurrences()) {

          if (moment(date).toISOString() !== moment(event.startTime.toDate()).toISOString()) {

            const instance: Event = {
              id: null,
              recurrenceId: event.id,
              recurrence: 'once',
              startTime: firebase.firestore.Timestamp.fromDate(moment(date).toDate()),
              endTime: firebase.firestore.Timestamp.fromDate(moment(date).add('milliseconds', event.endTime.toMillis() - event.startTime.toMillis()).toDate()),
              createdBy: event.createdBy,
              name: event.name,
              info: event.info,
              location: event.location,
              members: event.members
            }
            allEvents.push(instance);
          }

        }
      }
    })
    return of(allEvents);
  }

  removeInstances(allEvents: Event[]) {
    if (this.removedEvents.length) {
      return of(allEvents.filter(ev => !this.removedEvents.find(removed => removed.id === ev.recurrenceId)));
    } else {
      return of(allEvents);
    }
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

}

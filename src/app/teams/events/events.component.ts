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
import * as moment from 'moment';
import { ModalController, ToastController } from '@ionic/angular';

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
  date = moment().startOf('day').format('ll');
  month = moment().startOf('day').month();
  type: 'string';
  _disableWeeks: number[] = [];
  eventsSource: DayConfig[] = [];
  options: CalendarComponentOptions = {
    from: new Date(1970, 1, 1),
    disableWeeks: [...this._disableWeeks],
    daysConfig: this.eventsSource
  };

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private eventsService: EventsService,
    private modalController: ModalController,
    private toastController: ToastController
  ) { }

  dayChange($event) {
    if ($event.month() !== this.month) {
      this.eventsService.eventsObservable(this.uid, this.teamId, $event._d).subscribe();
      this.date = $event.format('ll');
      this.month = $event.month();
    } else {
      this.date = $event.format('ll');
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

  filterDay(event) {
    if (moment(event.startTime.toDate()).startOf('day').format('ll') == this.date) {
      return true;
    } else {
      return false;
    }
  }

  async createEventModal() {
    const modal = await this.modalController.create({
      component: CreateEventComponent,
      componentProps: {
        'teamId': this.teamId,
      }
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
      }
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

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.events$ = this.store.select<Event[]>('events');
    this.events$.pipe(map(events => {
      if (events) {
        events.forEach(e => {
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
        })
        this.options = {
          from: new Date(1970, 1, 1),
          disableWeeks: [...this._disableWeeks],
          daysConfig: this.eventsSource
        };
      }
    })).subscribe()
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

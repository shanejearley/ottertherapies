import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import moment from 'moment';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Group } from '../../../shared/services/groups/groups.service';
import { Member } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';
import { EventsService } from 'src/app/shared/services/events/events.service';
import { AngularFirestore } from '@angular/fire/firestore';

@Component({
    selector: 'app-create-event',
    templateUrl: 'create-event.component.html',
    styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent {

    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    nameFocus: boolean;
    locationFocus: boolean;
    startDateFocus: boolean;
    startTimeFocus: boolean;
    endTimeFocus: boolean;
    endDateFocus: boolean;
    recurrenceFocus: boolean;
    infoFocus: boolean;

    date: Date;

    newEvent = {
        name: null,
        location: null,
        startTime: null,
        endTime: null,
        info: null,
        type: 'Event',
        recurrence: 'once',
        members: []
    };

    recurrences = [
        'once',
        'daily',
        'weekly',
        'monthly-last',
        'monthly',
        'annually',
        'weekdays'
    ]

    dayFormat = moment(this.newEvent.startTime).format('MMM Do');
    allWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayNumber = moment(this.newEvent.startTime).toDate().getDay();
    lastDay = moment(this.newEvent.startTime).month() !== moment(this.newEvent.startTime).add('weeks', 1).month()
    dayString = this.allWeekdays[this.dayNumber];
    weekNumber = Math.ceil(moment(this.newEvent.startTime).toDate().getDate() / 7);
    nthString = this.weekNumber === 1 ? '1st' : this.weekNumber === 2 ? '2nd' : this.weekNumber === 3 ? '3rd' : `${this.weekNumber}th`
    nthWeekday: any = this.nthString + ' ' + this.dayString;

    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;

    teamId: string;
    selected: string;
    error: string;
    clicked: boolean;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private eventsService: EventsService,
        private db: AngularFirestore
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
        this.members$ = this.store.select<Member[]>('members');
        this.members$.pipe(map(members => {
            members.forEach(m => {
                if (m.uid == this.uid) {
                    m.isChecked = true;
                    this.newEvent.members.push(m);
                } else {
                    m.isChecked = false;
                }
            })
        })).subscribe()
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.date = this.navParams.get('date');
        this.newEvent.startTime = moment(this.date).set('hour', moment().hour()).add(59, 'm').startOf('h').toString(),
        this.newEvent.endTime = moment(this.date).set('hour', moment().hour()).add(59, 'm').startOf('h').add(1, 'h').toString()
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
    }

    nameChange() {
        if (this.newEvent.name && this.newEvent.name.length && this.error === 'You need an event name.') {
            this.error = null;
        }
    }

    async addEvent() {
        const newEventId = this.db.createId();

        if (!this.newEvent.name || !this.newEvent.name.length) {
            this.error = 'You need an event name.';
            this.clicked = false;
        } else {
            this.error = null;
            this.clicked = true;
            try {
                await this.eventsService.addEvent(newEventId, this.newEvent);
                return this.modalController.dismiss({
                    response: 'success'
                });
            } catch (err) {
                this.error = err.message;
                this.clicked = false;
            }
        }
    }

    changeStart() {
        this.dayFormat = moment(this.newEvent.startTime).format('MMM Do');
        this.dayNumber = moment(this.newEvent.startTime).toDate().getDay();
        this.lastDay = moment(this.newEvent.startTime).month() !== moment(this.newEvent.startTime).add('weeks', 1).month()
        this.dayString = this.allWeekdays[this.dayNumber];
        this.weekNumber = Math.ceil(moment(this.newEvent.startTime).toDate().getDate() / 7);
        this.nthString = this.weekNumber === 1 ? '1st' : this.weekNumber === 2 ? '2nd' : this.weekNumber === 3 ? '3rd' : `${this.weekNumber}th`
        this.nthWeekday = this.nthString + ' ' + this.dayString;
        this.newEvent.endTime = moment(this.newEvent.startTime).add(1, 'h').toString();
    }

    onChange(m) {
        console.log(this.newEvent.members);
        if (m.isChecked) {
            return this.addGuest(m);
        } else {
            return this.removeGuest(m);
        }
    }

    removeGuest(m) {
        const index = this.newEvent.members.indexOf(m);
        return this.newEvent.members.splice(index, 1);
    }

    addGuest(m) {
        return this.newEvent.members.push(m);
    }
}
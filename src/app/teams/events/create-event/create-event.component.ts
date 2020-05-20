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

@Component({
    selector: 'app-create-event',
    templateUrl: 'create-event.component.html',
    styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent {
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
    filterMembers$: Observable<Member[]>;

    showFilter: boolean = false;

    teamId: string;
    selected: string;
    queryText = '';
    filteredMembers: Member[];
    error: boolean;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private eventsService: EventsService
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

        this.filterMembers$ = this.members$.pipe(
            map(members => this.queryText.length ? members.filter((member: Member) => member.profile.displayName.toLowerCase().includes(this.queryText.toLowerCase()) || member.profile.email.toLowerCase().includes(this.queryText.toLowerCase())) : members.filter((member: Member) => true))
        )
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

    addEvent() {
        try {
            this.eventsService.addEvent(this.newEvent);
        } catch (err) {
            return this.modalController.dismiss({
                response: err
            })
        }
        return this.modalController.dismiss({
            response: 'success'
        });
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

    removeGuest(m) {
        m.isChecked = !m.isChecked;
        var index = this.newEvent.members.indexOf(m);
        this.newEvent.members.splice(index, 1);
    }

    addGuest(m) {
        this.error = false;
        if (!m.isChecked && m.uid !== this.uid) {
            m.isChecked = !m.isChecked;
            this.newEvent.members.push(m);
        } else {
            console.log('Already a guest');
        }
        this.queryText = '';
    }

    manualSearch() {
        this.members$.pipe(map(members => {
            if (members) {
                if (members.filter(m => m.profile.displayName == this.queryText || m.profile.email == this.queryText)[0]) {
                    this.addGuest(members.filter(m => m.profile.displayName == this.queryText || m.profile.email == this.queryText)[0]);
                } else {
                    this.error = true;
                    console.log('No member found');
                }
            }
        })).subscribe();
    }
}
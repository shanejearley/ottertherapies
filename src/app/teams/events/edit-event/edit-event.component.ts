import { Component } from '@angular/core';
import { NavParams, ModalController, ActionSheetController } from '@ionic/angular';

import moment from 'moment';

import firebase from 'firebase/app';

import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Group } from '../../../shared/services/groups/groups.service';
import { Member } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';
import { EventsService, Event } from 'src/app/shared/services/events/events.service';

@Component({
    selector: 'app-edit-event',
    templateUrl: 'edit-event.component.html',
    styleUrls: ['./edit-event.component.scss']
})
export class EditEventComponent {
    uid: string;
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

    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    event$: Observable<Event>;
    event;

    synced: boolean = false;

    date: Date;

    recurrences = [
        'once',
        'daily',
        'weekly',
        'monthly',
        'annually',
        'weekdays'
    ]

    allWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    dayFormat;
    dayNumber;
    dayString;
    weekNumber;
    lastDay;
    nthString;
    nthWeekday;

    memberStatus;
    remove = [];
    teamId: string;
    eventId: string;
    selected: string;
    error: boolean;

    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private eventsService: EventsService,
        private actionSheetController: ActionSheetController
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;
        this.profile$ = this.store.select<Profile>('profile');
    }

    ionViewWillEnter() {
        // can move this above constructor
        this.teamId = this.navParams.get('teamId');
        this.event = this.navParams.get('event');
        this.event.updateStartTime = moment(this.event.startTime.toDate()).toString();
        this.event.updateEndTime = moment(this.event.endTime.toDate()).toString();
        this.date = this.navParams.get('date');

        this.dayFormat = moment(this.event.updateStartTime).format('MMM Do');
        this.dayNumber = moment(this.event.updateStartTime).toDate().getDay();
        this.dayString = this.allWeekdays[this.dayNumber];
        this.weekNumber = Math.ceil(moment(this.event.updateStartTime).toDate().getDate() / 7);
        this.lastDay = moment(this.event.updateStartTime).month() !== moment(this.event.updateStartTime).add('weeks', 1).month()
        this.nthString = this.weekNumber === 1 ? '1st' : this.weekNumber === 2 ? '2nd' : this.weekNumber === 3 ? '3rd' : `${this.weekNumber}th`
        this.nthWeekday = this.nthString + ' ' + this.dayString;

        this.members$ = this.store.select<Member[]>('members');
        this.members$.pipe(
            map(members => {
                if (this.event.members && this.event.members.length) {
                    this.event.members.forEach(e => {
                        console.log(e);
                        if (this.uid === e.uid) {
                            this.memberStatus = e.status;
                        }
                    })
                    members.forEach(m => {
                        if (this.event.members.filter(eventMember => eventMember.uid == m.uid)[0]) {
                            m.isChecked = true;
                        } else {
                            m.isChecked = false;
                        }
                    })
                }
            })
        ).subscribe()
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    async presentActionSheet() {
        const actionSheet = await this.actionSheetController.create({
            header: 'Warning: Permanent Action',
            buttons: [{
                text: 'Delete',
                role: 'destructive',
                icon: 'trash',
                handler: async () => {
                    console.log('Delete clicked');
                    await this.eventsService.removeEvent(this.event.id);
                    return this.modalController.dismiss({
                        response: 'deleted'
                    });
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

    async removeEvent() {
        return this.presentActionSheet();
    }

    nameChange() {
        if (this.event.name && this.event.name.length) {
            this.error = false;
        }
    }

    async addToGcal() {
        this.synced = true;
        return this.eventsService.updateEventOnGcal(this.event);
    }

    updateEvent() {
        if (!this.event.name || !this.event.name.length) {
            this.error = true;
        } else {
            this.error = false;
            try {
                this.eventsService.updateEvent(this.event, this.remove);
            } catch (err) {
                return this.modalController.dismiss({
                    response: err
                })
            }
            return this.modalController.dismiss({
                response: 'success'
            });
        }
    }

    changeStart() {
        this.dayFormat = moment(this.event.updateStartTime).format('MMM Do');
        this.dayNumber = moment(this.event.updateStartTime).toDate().getDay();
        this.dayString = this.allWeekdays[this.dayNumber];
        this.weekNumber = Math.ceil(moment(this.event.updateStartTime).toDate().getDate() / 7);
        this.lastDay = moment(this.event.updateStartTime).month() !== moment(this.event.updateStartTime).add('weeks', 1).month()
        this.nthString = this.weekNumber === 1 ? '1st' : this.weekNumber === 2 ? '2nd' : this.weekNumber === 3 ? '3rd' : `${this.weekNumber}th`
        this.nthWeekday = this.nthString + ' ' + this.dayString;
        this.event.updateEndTime = moment(this.event.updateStartTime).add(1, 'h').toString();
    }

    onChange(ev, m) {
        if (ev.detail.checked) {
            if (!this.event.members.find(g => g.uid === m.uid)) {
                return this.addGuest(m);
            } else {
                return console.log('Member already added');
            }
        } else if (!ev.detail.checked) {
            if (this.event.members.find(g => g.uid === m.uid)) {
                return this.removeGuest(m);
            } else {
                return console.log('Member already removed');
            }
        }
    }

    async removeGuest(m) {
        return this.remove.push(m.uid);
    }

    addGuest(m) {
        return this.event.members.push(m);
    }
}
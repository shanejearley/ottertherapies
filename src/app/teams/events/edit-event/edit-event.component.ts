import { Component } from '@angular/core';
import { NavParams, ModalController, ActionSheetController } from '@ionic/angular';

import moment from 'moment';

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
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    filterMembers$: Observable<Member[]>;
    event$: Observable<Event>;
    event;

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
    queryText = '';
    filteredMembers: Member[];
    error: boolean;

    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private eventsService: EventsService,
        private actionSheetController: ActionSheetController
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
    }

    ionViewWillEnter() {
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

        this.filterMembers$ = this.members$.pipe(
            map(members => this.queryText.length ? members.filter((member: Member) => member.profile.displayName.toLowerCase().includes(this.queryText.toLowerCase()) || member.profile.email.toLowerCase().includes(this.queryText.toLowerCase())) : members.filter((member: Member) => true))
        )
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

    get uid() {
        return this.authService.user.uid;
    }

    updateEvent() {
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

    removeGuest(m) {
        m.isChecked = !m.isChecked;
        var index = this.event.members.indexOf(m);
        this.event.members.splice(index, 1);
        this.remove.push(m.uid);
    }

    addGuest(m) {
        this.error = false;
        if (!m.isChecked && m.uid !== this.uid) {
            m.isChecked = !m.isChecked;
            this.event.members.push(m);
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
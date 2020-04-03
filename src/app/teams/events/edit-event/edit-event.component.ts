import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import * as moment from 'moment';

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
    event$: Observable<Event>;
    event;
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
        private eventsService: EventsService
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.eventId = this.navParams.get('eventId');
        this.event$ = this.eventsService.getEvent(this.eventId);
        this.event$.pipe(tap(ev => { 
            this.event = ev;
            this.event.updateStartTime = moment(this.event.startTime.toDate()).toString();
            this.event.updateEndTime = moment(this.event.endTime.toDate()).toString();
        })).subscribe();
        this.members$ = this.store.select<Member[]>('members');
        this.members$.pipe(map(members => {
            if (this.event.members && this.event.members.length) {
                members.forEach(m => {
                    if (this.event.members.filter(eventMember => eventMember.uid == m.uid)[0]) {
                        m.isChecked = true;
                    } else {
                        m.isChecked = false;
                    }
                })
            }
        })).subscribe()
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
    }

    updateEvent() {
        try {
            this.eventsService.updateEvent(this.event);
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
        this.event.updateEndTime = moment(this.event.updateStartTime).add(1, 'h').toString();
    }

    removeGuest(m) {
        m.isChecked = !m.isChecked;
        var index = this.event.members.indexOf(m);
        this.event.members.splice(index, 1);
        this.eventsService.removeGuest(this.event.id, m.uid);
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

    filterMembers(search: string) {
        this.members$.pipe(map(members => {
            if (members) {
                if (search.length) {
                    this.filteredMembers = members.filter(o =>
                        Object.keys(o).some(k => {
                            if (typeof o[k] === 'string')
                                return o[k].toLowerCase().includes(search.toLowerCase());
                        })
                    );
                } else {
                    this.filteredMembers = members;
                }
            }
        })).subscribe()
    }
}
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
    newEvent = {
        name: null,
        location: null,
        startTime: moment().add(59, 'm').startOf('h').toString(),
        endTime: moment().add(59, 'm').startOf('h').add(1, 'h').toString(),
        info: null,
        type: 'Event',
        members: []
    };
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
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
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
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

    filterMembers(search: string) {
        this.members$.pipe(map(members => {
            if (members) {
                if (search.length) {
                    this.filteredMembers = members.filter(o =>
                        Object.keys(o.profile).some(k => {
                            if (typeof o.profile[k] === 'string' && k == 'displayName' || typeof o.profile[k] === 'string' && k == 'email') {
                                console.log(o.profile[k], search);
                                return o.profile[k].toLowerCase().includes(search.toLowerCase());
                            }
                        })
                    );
                } else {
                    this.filteredMembers = members;
                }
            }
        })).subscribe()
    }
}
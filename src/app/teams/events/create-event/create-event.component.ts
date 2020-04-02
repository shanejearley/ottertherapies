import { Component, Input } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { NavParams, ModalController } from '@ionic/angular';
import { formatDate } from "@angular/common";

import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import 'firebase/storage';
import * as moment from 'moment';

import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';
import { tap, filter, map, finalize, last, switchMap } from 'rxjs/operators';

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
        startDate: moment().toString(),
        startTime: moment().toString(),
        endDate: moment().add(1,'h').toString(),
        endTime: moment().add(1,'h').toString(),
        info: null,
        members: []
    };
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    teamId: string;
    selected: string;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private db: AngularFirestore,
        private store: Store,
        private authService: AuthService,
        private eventsService: EventsService
    ) { }

    ngOnInit() {
        this.selected = 'Event';
        this.profile$ = this.store.select<Profile>('profile');
        this.members$ = this.store.select<Member[]>('members');
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    loopMembers() {
        this.members$.pipe(map(members => {
            members.forEach(m => {
                if (m.isChecked) {
                    m.isChecked = !m.isChecked;
                    if (m.uid !== this.uid) {
                        this.newEvent.members.push(m);
                    }
                }
            })
        })).subscribe()
    }

    get uid() {
        return this.authService.user.uid;
    }

    async addEvent() {
        try {
            await this.loopMembers();
            await this.eventsService.addEvent(this.uid, this.teamId, this.newEvent);
        } catch (err) {
            return this.modalController.dismiss({
                response: 'error'
            })
        }
        return this.modalController.dismiss({
            response: 'success'
        });
    }

    setEndDate() {
        this.newEvent.endDate = moment(this.newEvent.startDate).add(1,'h').toString();
    }

    setEndTime() {
        this.newEvent.endTime = moment(this.newEvent.startTime).add(1,'h').toString();
    }

    removeGuest(m) {
        m.isChecked = !m.isChecked;
    }
}
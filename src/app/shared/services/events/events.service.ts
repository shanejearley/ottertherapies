import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Router, RoutesRecognized } from '@angular/router';
import { firestore } from 'firebase/app';
import 'firebase/storage';

import { Store } from 'src/store';
import { ProfileService, Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable, Subscription } from 'rxjs';
import { tap, filter, map } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';

export interface Member {
    status: string,
    uid: string,
    profile: Profile,
}

export interface Event {
    createdBy: string,
    id: string,
    startTime: firestore.Timestamp,
    endTime: firestore.Timestamp,
    name: string,
    info: string,
    location: string,
    type: string,
    members: Member[]
}

// export interface Unread {
//     unreadMessages: number,
//     unreadFiles: number,
//     unreadNotes: number
// }

@Injectable()
export class EventsService {
    private eventsCol: AngularFirestoreCollection<Event>;
    private membersCol: AngularFirestoreCollection;
    private eventDoc: AngularFirestoreDocument<Event>;
    // private unreadDoc: AngularFirestoreDocument<Unread>;
    // unread$: Observable<Unread>;
    event$: Observable<Event>;
    teamId: string;
    uid: string;
    events$;
    events: Event[];
    date: Date;
    monthStart: firestore.Timestamp;
    monthEnd: firestore.Timestamp;

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private storage: AngularFireStorage,
        private authService: AuthService,
        private profileService: ProfileService,
        private router: Router,

    ) { }

    eventsObservable(userId, teamId, date) {
        this.events = [];
        this.events.length = 0;
        this.events$ = null;
        this.uid = userId;
        this.teamId = teamId;
        this.date = date;
        this.monthStart = firestore.Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), 1));
        this.monthEnd = firestore.Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
        this.eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`, ref => ref.orderBy('startTime').startAt(this.monthStart).endAt(this.monthEnd));
        this.events$ = this.eventsCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(map(actions => actions.map(a => {
                console.log('ACTION', a);
                if (a.type == 'removed') {
                    ///remove based on event.id
                    const event = a.payload.doc.data() as Event;
                    event.id = a.payload.doc.id;
                    return;
                }
                if (a.type == 'added' || a.type == 'modified') {
                    const event = a.payload.doc.data() as Event;
                    event.id = a.payload.doc.id;
                    const exists = this.events.find(e => e.id === event.id)
                    if (event.startTime && !exists) {
                        
                        //this.profileService.getProfile(event);
                        this.events.push(event);
                    }
                    if (event.startTime && exists) {
                        this.events.find(e => e.id == event.id).startTime = event.startTime;
                        this.events.find(e => e.id == event.id).endTime = event.endTime;
                    }
                }
                return this.store.set('events', this.events)
            })))
        return this.events$;
    }

    addEvent(event) {
        const newEvent = {
            createdBy: this.uid,
            id: null,
            startTime: firestore.Timestamp.fromDate(new Date(event.startTime)),
            endTime: firestore.Timestamp.fromDate(new Date(event.endTime)),
            name: event.name,
            info: event.info,
            type: event.type,
            location: event.location,
            members: event.members
        }
        this.eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`);
        this.eventsCol.add(newEvent).then(docRef => {
            this.membersCol = this.db.collection(`teams/${this.teamId}/calendar/${docRef.id}/members`);
            event.members.forEach(m => {
                this.membersCol.doc(m.uid).set({
                    uid: m.uid,
                    status: "Member"
                })
            })
        });
    }
}
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { firestore } from 'firebase/app';
import 'firebase/storage';
import moment from 'moment';


import { Store } from 'src/store';
import { Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

import { MembersService } from '../members/members.service';

export interface Member {
    status: string,
    uid: string,
    profile: Profile
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

@Injectable()
export class EventsService {
    private eventsCol: AngularFirestoreCollection<Event>;
    private membersCol: AngularFirestoreCollection<Member>;
    event$: Observable<Event>;
    teamId: string;
    uid: string;
    events$;
    events: Event[];
    date: Date;
    monthStart: firestore.Timestamp;
    monthEnd: firestore.Timestamp;
    members$;

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private membersService: MembersService,

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
            .pipe(
                map(actions => actions.map(a => {
                    console.log('ACTION', a);
                    if (a.type == 'removed') {
                        const event = a.payload.doc.data() as Event;
                        event.id = a.payload.doc.id;
                    }
                    if (a.type == 'added' || a.type == 'modified') {
                        const event = a.payload.doc.data() as Event;
                        event.id = a.payload.doc.id;
                        const exists = this.events.find(e => e.id === event.id)
                        if (event.startTime && !exists) {
                            this.getMembers(event);
                            this.events.push(event);
                        } else if (event.startTime && exists) {
                            let eventIndex = this.events.findIndex(e => e.id == event.id);
                            event.members = this.events[eventIndex].members;
                            this.events[eventIndex] = event;
                        }
                    }
                    return this.store.set('events', this.events)
                })),
                shareReplay(1))
        return this.events$;
    }

    getMembers(event: Event) {
        event.members = [];
        this.membersCol = this.db.collection<Member>(`teams/${this.teamId}/calendar/${event.id}/members`);
        this.membersCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(
                map(actions => actions.map(a => {
                    if (a.type == 'removed') {
                        const member = a.payload.doc.data() as Member;
                        member.uid = a.payload.doc.id;
                    }
                    if (a.type == 'added' || a.type == 'modified') {
                        const member = a.payload.doc.data() as Member;
                        member.uid = a.payload.doc.id;
                        const exists = event.members.find(m => m.uid === member.uid)
                        if (!exists) {
                            this.membersService.getMember(member.uid).subscribe(m => {
                                member.profile = m.profile;
                                event.members.push(member);
                            })
                        } else {
                            let memberIndex = event.members.findIndex(m => m.uid == member.uid);
                            this.membersService.getMember(member.uid).subscribe(m => {
                                member.profile = m.profile;
                                event.members[memberIndex] = member;
                            })
                        }
                    }
                })),
                shareReplay(1)
            ).subscribe();
    }

    getEvent(id: string) {
        return this.store.select<Event[]>('events')
            .pipe(
                filter(Boolean),
                map((event: Event[]) => event.find((event: Event) => event.id === id)));
    }

    getToday(day) {
        return this.store.select<Event[]>('events')
            .pipe(
                filter(Boolean),
                map((events: Event[]) => events.filter((event: Event) => moment(event.startTime.toDate()).startOf('day').format('ll') == day)))
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
            members: null
        }
        this.eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`);
        return this.eventsCol.add(newEvent).then(docRef => {
            this.membersCol = this.db.collection(`teams/${this.teamId}/calendar/${docRef.id}/members`);
            return event.members.forEach(m => {
                return this.membersCol.doc(m.uid).set({
                    uid: m.uid,
                    status: "Member"
                }, { merge: true })
            })
        });
    }

    removeGuest(eventId: string, uid: string) {
        this.membersCol = this.db.collection(`teams/${this.teamId}/calendar/${eventId}/members`);
        return this.membersCol.doc(uid).delete();
    }

    updateEvent(event, remove) {
        const updateEvent = {
            createdBy: this.uid,
            id: null,
            startTime: firestore.Timestamp.fromDate(new Date(event.updateStartTime)),
            endTime: firestore.Timestamp.fromDate(new Date(event.updateEndTime)),
            name: event.name,
            info: event.info,
            type: event.type,
            location: event.location
        }
        this.eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`);
        return this.eventsCol.doc(event.id).update(updateEvent).then(() => {
            this.membersCol = this.db.collection(`teams/${this.teamId}/calendar/${event.id}/members`);
            if (remove.length) {
                return remove.forEach(r => {
                    return this.removeGuest(event.id, r);
                })
            }
            if (event.members.length) {
                return event.members.forEach(m => {
                    if (m.uid == this.uid) {
                        return this.membersCol.doc(m.uid).set({
                            uid: m.uid,
                            status: "Admin"
                        }, { merge: true })
                    } else {
                        return this.membersCol.doc(m.uid).set({
                            uid: m.uid,
                            status: "Member"
                        }, { merge: true })
                    }
                })
            }
        });
    }
}
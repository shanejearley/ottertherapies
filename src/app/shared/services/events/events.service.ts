import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument, DocumentChangeType, DocumentChangeAction, DocumentChange } from '@angular/fire/firestore';
import { firestore } from 'firebase/app';
import 'firebase/storage';
import moment from 'moment';


import { Store } from 'src/store';
import { Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable, combineLatest } from 'rxjs';
import { filter, map, shareReplay, tap } from 'rxjs/operators';

import { MembersService, Member } from '../members/members.service';


export interface EventMember {
    status: string,
    uid: string,
    profile: Observable<Member>
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
    recurrence: string,
    recurrenceId?: string,
    until?: firestore.Timestamp,
    members: EventMember[],
    update?: firestore.FieldValue
}

@Injectable()
export class EventsService {
    private eventsCol: AngularFirestoreCollection<Event>;
    private membersCol: AngularFirestoreCollection<EventMember>;
    event$: Observable<Event>;
    teamId: string;
    uid: string;
    events$;
    recurringEvents$;
    events: Event[];
    recurringEvents: Event[];
    date: Date;
    lastMonthStart: firestore.Timestamp;
    nextMonthEnd: firestore.Timestamp;
    members$;

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private membersService: MembersService,

    ) { }

    eventsObservable(userId, teamId, date) {
        this.store.set('events', null);
        this.events = [];
        this.events.length = 0;
        this.events$ = null;
        this.uid = userId;
        this.teamId = teamId;
        this.date = date;
        /// optimization might include only loading the last week of the previous month and first week of the next month
        this.lastMonthStart = firestore.Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
        this.nextMonthEnd = firestore.Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth() + 2, 0));
        const eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`, ref => ref.where('recurrence', '==', 'once').orderBy('startTime').startAt(this.lastMonthStart).endAt(this.nextMonthEnd));
        this.events$ = eventsCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(
                map(actions => actions.map(a => {
                    console.log('ACTION', a);
                    if (a.type == 'removed') {
                        const event = a.payload.doc.data() as Event;
                        event.id = a.payload.doc.id;
                        this.events.forEach((e) => {
                            if (e.id === event.id) {
                                console.log('events', this.events);
                                var index = this.events.indexOf(e);
                                this.events.splice(index, 1);
                                console.log("Removed event: ", e);
                                return this.events;
                            }
                        })
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

    recurringEventsObservable(userId, teamId) {
        this.store.set('recurringEvents', null);
        this.recurringEvents = [];
        this.recurringEvents.length = 0;
        this.recurringEvents$ = null;
        this.uid = userId;
        this.teamId = teamId;
        const recurringEventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`, ref => ref.where('recurrence', 'in', ['daily', 'weekly', 'monthly', 'monthly-last', 'annually', 'weekdays']).orderBy('startTime').startAt(this.lastMonthStart).endAt(this.nextMonthEnd));
        this.recurringEvents$ = recurringEventsCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(
                map(actions => actions.map(a => {
                    console.log('ACTION', a);
                    if (a.type == 'removed') {
                        const event = a.payload.doc.data() as Event;
                        event.id = a.payload.doc.id;
                        try {
                            const removeEv = this.recurringEvents.find((e: Event) => e.id === event.id);
                            const index = this.recurringEvents.indexOf(removeEv);
                            this.recurringEvents.splice(index, 1);
                            return this.recurringEvents;
                        } catch (err) {
                            console.log(err);
                        }
                    }
                    if (a.type == 'added' || a.type == 'modified') {
                        const event = a.payload.doc.data() as Event;
                        event.id = a.payload.doc.id;
                        const exists = this.recurringEvents.find(e => e.id === event.id)
                        if (event.startTime && !exists) {
                            this.getMembers(event);
                            this.recurringEvents.push(event);
                        } else if (event.startTime && exists) {
                            let eventIndex = this.recurringEvents.findIndex(e => e.id == event.id);
                            event.members = this.recurringEvents[eventIndex].members;
                            this.recurringEvents[eventIndex] = event;
                        }
                    } else {
                        console.log('Else Case Recurring Event');
                        return this.recurringEvents;
                    }
                    return this.store.set('recurringEvents', this.recurringEvents)
                })),
                shareReplay(1))
        return this.recurringEvents$;
    }

    getMembers(event: Event) {
        event.members = [];
        this.membersCol = this.db.collection<EventMember>(`teams/${this.teamId}/calendar/${event.id}/members`);
        this.membersCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(
                map(actions => actions.map(a => {
                    if (a.type == 'removed') {
                        const member = a.payload.doc.data() as EventMember;
                        member.uid = a.payload.doc.id;
                        const removeMember = event.members.find(m => m.uid === member.uid);
                        const index = event.members.indexOf(removeMember);
                        console.log('removing event member at index ', index);
                        return event.members.splice(index, 1);
                    }
                    if (a.type == 'added' || a.type == 'modified') {
                        const member = a.payload.doc.data() as EventMember;
                        member.uid = a.payload.doc.id;
                        const exists = event.members.find(m => m.uid === member.uid)
                        if (!exists) {
                            member.profile = this.membersService.getMember(member.uid);
                            event.members.push(member);
                        } else {
                            let memberIndex = event.members.findIndex(m => m.uid == member.uid);
                            member.profile = this.membersService.getMember(member.uid);
                            event.members[memberIndex] = member;
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

    async removeEvent(eventId: string) {
        const eventDoc = this.db.doc<Event>(`teams/${this.teamId}/calendar/${eventId}`);
        return eventDoc.delete();
    }

    async addEvent(eventId, event) {
        const newEvent = {
            createdBy: this.uid,
            id: eventId,
            startTime: firestore.Timestamp.fromDate(new Date(event.startTime)),
            endTime: firestore.Timestamp.fromDate(new Date(event.endTime)),
            name: event.name,
            info: event.info,
            type: event.type,
            location: event.location,
            recurrence: event.recurrence,
            members: null
        }
        this.eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`);
        await this.eventsCol.doc(eventId).set(newEvent, { merge: true });
        this.membersCol = this.db.collection(`teams/${this.teamId}/calendar/${eventId}/members`);
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

    removeGuest(eventId: string, uid: string) {
        this.membersCol = this.db.collection(`teams/${this.teamId}/calendar/${eventId}/members`);
        return this.membersCol.doc(uid).delete();
    }

    async updateEventOnGcal(event) {
        const updateEvent = {
            createdBy: this.uid,
            id: event.id,
            startTime: firestore.Timestamp.fromDate(new Date(event.updateStartTime)),
            endTime: firestore.Timestamp.fromDate(new Date(event.updateEndTime)),
            name: event.name,
            info: event.info,
            type: event.type,
            location: event.location,
            recurrence: event.recurrence,
            update: firestore.FieldValue.serverTimestamp()
        }
        this.eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`);
        return this.eventsCol.doc(event.id).update(updateEvent);
    }

    async updateEvent(event, remove) {
        const updateEvent = {
            createdBy: this.uid,
            id: event.id,
            startTime: firestore.Timestamp.fromDate(new Date(event.updateStartTime)),
            endTime: firestore.Timestamp.fromDate(new Date(event.updateEndTime)),
            name: event.name,
            info: event.info,
            type: event.type,
            location: event.location,
            recurrence: event.recurrence
        }
        this.eventsCol = this.db.collection<Event>(`teams/${this.teamId}/calendar`);
        await this.eventsCol.doc(event.id).update(updateEvent)
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
    }
}
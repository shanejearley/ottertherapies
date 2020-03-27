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

    addEvent(uid, teamId, event) {
        return console.log(uid, teamId, event);
    }

    // monthEvents.date = date;
    // monthEvents.monthStart = firebase.firestore.Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), 1));
    // monthEvents.monthEnd = firebase.firestore.Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    // db.collection("teams").doc(teamId).collection("calendar")
    // .orderBy("startTime")
    // .startAt(monthEvents.monthStart)
    // .endAt(monthEvents.monthEnd)
    // .onSnapshot(function(snapshot) {
    //   snapshot.docChanges().forEach(function(change) {
    //     if (change.type === "added") {
    //       if (change.doc.data().id) {
    //           db.collection("teams").doc(teamId).collection("calendar").doc(change.doc.data().id).collection("members")
    //           .doc(user.uid)
    //           .get().then(function(doc) {
    //               if (doc.exists) {
    //                   console.log("New event for this user: ", change.doc.data());
    //                   var newEvent = change.doc.data();
    //                   newEvent.member = true;
    //                   $timeout(function() {
    //                       monthEvents.list.push(newEvent);
    //                       $filter('orderBy')(monthEvents.list, 'startTime', true)
    //                   })
    //               } else {
    //                   console.log("New event without this user: ", change.doc.data());
    //                   var newEvent = change.doc.data();
    //                   newEvent.member = false;
    //                   $timeout(function() {
    //                       monthEvents.list.push(newEvent);
    //                       $filter('orderBy')(monthEvents.list, 'startTime', true)
    //                   })
    //               }
    //           })
    //       }
    //     }
    //     if (change.type === "modified") {
    //       if (change.doc.data().id && change.doc.data().startTime && change.doc.data().endTime) {
    //           if ($filter('filter')(monthEvents.list, {id: change.doc.data().id}, true)[0]) {
    //               db.collection("teams").doc(teamId).collection("calendar").doc(change.doc.data().id).collection("members")
    //               .doc(user.uid)
    //               .get().then(function(doc) {
    //                   if (doc.exists) {
    //                       console.log("Modified event for this user: ", change.doc.data());
    //                       $filter('filter')(monthEvents.list, {id: change.doc.data().id}, true)[0] = change.doc.data();
    //                       $filter('filter')(monthEvents.list, {id: change.doc.data().id}, true)[0].member = true;
    //                   } else {
    //                       console.log("Modified event without this user: ", change.doc.data());
    //                       $filter('filter')(monthEvents.list, {id: change.doc.data().id}, true)[0] = change.doc.data();
    //                       $filter('filter')(monthEvents.list, {id: change.doc.data().id}, true)[0].member = false;
    //                   }
    //               })
    //           }
    //           else {
    //               db.collection("teams").doc(teamId).collection("calendar").doc(change.doc.data().id).collection("members")
    //               .doc(user.uid)
    //               .get().then(function(doc) {
    //                   if (doc.exists) {
    //                       console.log("New modified event for this user: ", change.doc.data());
    //                       var newEvent = change.doc.data();
    //                       newEvent.member = true;
    //                       $timeout(function() {
    //                           monthEvents.list.push(newEvent);
    //                           console.log("Remove duplicates");
    //                           monthEvents.list.forEach(function(event1, index1) {
    //                             monthEvents.list.forEach(function(event2, index2) {
    //                               if (event1.id == event2.id && index1 !== index2) {
    //                                 var index = monthEvents.list.indexOf(event1);
    //                                 monthEvents.list.splice(index, 1);
    //                                 console.log("Found a duplicate, removed old");
    //                               }
    //                             })
    //                           })
    //                           $filter('orderBy')(monthEvents.list, 'startTime', true)
    //                       })
    //                   } else {
    //                       console.log("New modified event without this user: ", change.doc.data());
    //                       var newEvent = change.doc.data();
    //                       newEvent.member = false;
    //                       $timeout(function() {
    //                           monthEvents.list.push(newEvent);
    //                           console.log("Remove duplicates");
    //                           monthEvents.list.forEach(function(event1, index1) {
    //                             monthEvents.list.forEach(function(event2, index2) {
    //                               if (event1.id == event2.id && index1 !== index2) {
    //                                 var index = monthEvents.list.indexOf(event1);
    //                                 monthEvents.list.splice(index, 1);
    //                                 console.log("Found a duplicate, removed old");
    //                               }
    //                             })
    //                           })
    //                           $filter('orderBy')(monthEvents.list, 'startTime', true)
    //                       })
    //                   }
    //               })
    //           }
    //       }
    //     }
    //     if (change.type === "removed") {
    //       console.log("Removed event: ", change.doc.data());
    //       var index = monthEvents.list.indexOf($filter('filter')(monthEvents.list, {id: change.doc.data().id}, true)[0]);
    //       monthEvents.list.splice(index, 1);
    //     }
    //   })
    //   $timeout(function() {
    //       monthEvents.list.forEach(function(event1, index1) {
    //           monthEvents.list.forEach(function(event2, index2) {
    //               if (event1.id === event2.id && index1 !== index2) {
    //                   console.log("Removing Duplicate");
    //                   var index = monthEvents.list.indexOf(event2);
    //                   monthEvents.list.splice(index, 1);
    //               }
    //           })
    //       })
    //       $filter('orderBy')(monthEvents.list, 'startTime', true)
    //       delay.resolve(monthEvents);
    //   })
    // })

    // getNote(id: string) {
    //     return this.store.select<Note[]>('notes')
    //         .pipe(
    //             filter(Boolean),
    //             map((note: Note[]) => note.find((note: Note) => note.id === id)));
    // }

    // addNote(body: string) {
    //     const note: Note = {
    //         body: body,
    //         id: null,
    //         timestamp: firestore.FieldValue.serverTimestamp(),
    //         uid: this.uid,
    //         unread: null,
    //         comments: null,
    //         isChecked: null,
    //         commentCount: null,
    //         flag: false
    //     }
    //     this.notesCol = this.db.collection<Note>(`teams/${this.teamId}/notes`);
    //     this.notesCol.add(note);
    // }

}
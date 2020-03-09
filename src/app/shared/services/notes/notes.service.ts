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

export interface Note {
    body: string,
    id: string,
    timestamp: firestore.FieldValue,
    uid: string,
    unread: Unread,
    comments: Comment[],
    isChecked: boolean
}

export interface Unread {
    unreadMessages: number,
    unreadFiles: number,
    unreadNotes: number
}

export interface Comment {
    body: string,
    id: string,
    uid: string,
    timestamp: firestore.FieldValue,
    profile: Profile
}

@Injectable()
export class NotesService {
    private notesCol: AngularFirestoreCollection<Note>;
    private commentsCol: AngularFirestoreCollection<Comment>;
    private noteDoc: AngularFirestoreDocument<Note>;
    private unreadDoc: AngularFirestoreDocument<Unread>;
    unread$: Observable<Unread>;
    note$: Observable<Note>;
    comments$: Observable<Number[]>;
    teamId: string;
    uid: string;
    notes$: Observable<Note[]>;
    comment: Comment;

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private storage: AngularFireStorage,
        private authService: AuthService,
        private profileService: ProfileService,
        private router: Router,

    ) { }

    notesObservable(userId, teamId) {
        this.uid = userId;
        this.teamId = teamId;
        this.notesCol = this.db.collection<Note>(`teams/${this.teamId}/notes`);
        this.notes$ = this.notesCol.valueChanges({ idField: 'id' })
            .pipe(tap(next => {
                next.forEach(note => {
                    this.profileService.getProfile(note);
                    //this.getUnread(note);
                    this.getComments(note);
                })
                this.store.set('notes', next)
            }));
        return this.notes$;
    }

    //   getUnread(group: Group) {
    //     this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${group.id}`);
    //     this.unread$ = this.unreadDoc.valueChanges()
    //       .pipe(tap(next => {
    //         if (!next) {
    //           return;
    //         }
    //         group.unread = next;
    //       }))
    //     this.unread$.subscribe();
    //   }

    getComments(note: Note) {
        note.comments = [];
        this.commentsCol = this.db.collection<Comment>(`teams/${this.teamId}/notes/${note.id}/comments`, ref => ref.orderBy('timestamp'));
        this.comments$ = this.commentsCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(map(actions => actions.map(a => {
                console.log('ACTION', a);
                if (a.type == 'removed') {
                    ///remove based on file.id
                    const comment = a.payload.doc.data() as Comment;
                    comment.id = a.payload.doc.id;
                    note.comments.forEach(function (m) {
                        if (m.id === comment.id) {
                            var index = note.comments.indexOf(comment);
                            note.comments.splice(index, 1);
                            console.log("Removed note comment: ", comment);
                        }
                    })
                }
                if (a.type == 'added' || a.type == 'modified') {
                    const comment = a.payload.doc.data() as Comment;
                    if (comment.timestamp) {
                        comment.id = a.payload.doc.id;
                        this.profileService.getProfile(comment);
                        return note.comments.push(comment);
                    }
                }
            })))
        this.comments$.subscribe();
    }

    getNote(id: string) {
        return this.store.select<Note[]>('notes')
            .pipe(
                filter(Boolean),
                map((note: Note[]) => note.find((note: Note) => note.id === id)));
    }

    //   checkLastMessage(groupId: string) {
    //     this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${groupId}`);
    //     this.unreadDoc.update({
    //       unreadMessages: 0
    //     });
    //   }

    //   checkLastFile(groupId: string) {
    //     this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${groupId}`);
    //     this.unreadDoc.update({
    //       unreadFiles: 0
    //     });
    //   }

}
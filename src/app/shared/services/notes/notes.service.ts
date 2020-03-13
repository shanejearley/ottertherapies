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
    isChecked: boolean,
    commentCount: firestore.FieldValue,
    flag: boolean
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
    notes$;
    comment: Comment;
    notes: Note[];

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private storage: AngularFireStorage,
        private authService: AuthService,
        private profileService: ProfileService,
        private router: Router,

    ) { }

    notesObservable(userId, teamId) {
        this.notes = [];
        this.uid = userId;
        this.teamId = teamId;
        this.notesCol = this.db.collection<Note>(`teams/${this.teamId}/notes`);
        this.notes$ = this.notesCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(map(actions => actions.map(a => {
                console.log('ACTION', a);
                if (a.type == 'removed') {
                    ///remove based on note.id
                    const note = a.payload.doc.data() as Note;
                    note.id = a.payload.doc.id;
                    return;
                }
                if (a.type == 'added' || a.type == 'modified') {
                    const note = a.payload.doc.data() as Note;
                    note.id = a.payload.doc.id;
                    const exists = this.notes.find(n => n.id === note.id)
                    if (note.timestamp && !exists) {
                        this.profileService.getProfile(note);
                        this.getComments(note);
                        this.notes.push(note);
                    }
                    if (note.timestamp && exists) {
                        this.notes.find(n => n.id == note.id).flag = note.flag;
                        this.notes.find(n => n.id == note.id).commentCount = note.commentCount;
                    }
                }
                return this.store.set('notes', this.notes)
            })))
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

    addNote(body: string) {
        const note: Note = {
            body: body,
            id: null,
            timestamp: firestore.FieldValue.serverTimestamp(),
            uid: this.uid,
            unread: null,
            comments: null,
            isChecked: null,
            commentCount: null,
            flag: false
        }
        this.notesCol = this.db.collection<Note>(`teams/${this.teamId}/notes`);
        this.notesCol.add(note);
    }

    addComment(body: string, noteId) {
        const comment: Comment = {
            body: body,
            id: null,
            uid: this.uid,
            timestamp: firestore.FieldValue.serverTimestamp(),
            profile: null
        }
        this.commentsCol = this.db.collection<Comment>(`teams/${this.teamId}/notes/${noteId}/comments`);
        this.commentsCol.add(comment).then(() => {
            this.noteDoc = this.db.doc<Note>(`teams/${this.teamId}/notes/${noteId}`);
            this.noteDoc.update({
                commentCount:firestore.FieldValue.increment(1)
            })
        });
    }

    flagNote(note: Note) {
        this.noteDoc = this.db.doc<Note>(`teams/${this.teamId}/notes/${note.id}`);
        this.noteDoc.update({
            flag: !note.flag
        });
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
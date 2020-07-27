import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { firestore } from 'firebase/app';
import 'firebase/storage';

import { Store } from 'src/store';
import { Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable } from 'rxjs';
import { tap, filter, map, shareReplay } from 'rxjs/operators';

import { MembersService, Member } from '../members/members.service';
import { Unread } from '../teams/teams.service';

export interface Note {
    body: string,
    id: string,
    timestamp: firestore.FieldValue,
    uid: string,
    unread: Unread,
    comments: Comment[],
    isChecked: boolean,
    commentCount: firestore.FieldValue,
    flag: boolean,
    profile: Observable<Member>,
    newComment: string
}

export interface Comment {
    body: string,
    id: string,
    uid: string,
    timestamp: firestore.FieldValue,
    profile: Observable<Member>
}

@Injectable()
export class NotesService {
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
        private membersService: MembersService,
    ) { }

    notesObservable(userId, teamId) {
        this.store.set('notes', null);
        this.notes$ = null;
        this.notes = [];
        this.notes.length = 0;
        this.uid = userId;
        this.teamId = teamId;
        this.notes$ = this.db.collection<Note>(`teams/${this.teamId}/notes`).stateChanges(['added', 'modified', 'removed'])
            .pipe(
                map(actions => actions.map(a => {
                    console.log('ACTION', a);
                    if (a.type == 'removed') {
                        const note = a.payload.doc.data() as Note;
                        note.id = a.payload.doc.id;
                        this.notes.forEach((n) => {
                            if (n.id === note.id) {
                                console.log('notes', this.notes);
                                var index = this.notes.indexOf(n);
                                this.notes.splice(index, 1);
                                console.log("Removed note: ", n);
                            }
                        })
                    }
                    if (a.type == 'added' || a.type == 'modified') {
                        const note = a.payload.doc.data() as Note;
                        note.id = a.payload.doc.id;
                        const exists = this.notes.find(n => n.id === note.id)
                        if (note.timestamp && !exists) {
                            note.profile = this.membersService.getMember(note.uid);
                            this.getComments(note);
                            this.notes.push(note);
                        }
                        if (note.timestamp && exists) {
                            this.notes.find(n => n.id == note.id).flag = note.flag;
                            this.notes.find(n => n.id == note.id).commentCount = note.commentCount;
                        }
                    }
                    return this.store.set('notes', this.notes)
                })),
                shareReplay(1)
            )
        return this.notes$;
    }

    getComments(note: Note) {
        note.comments = [];
        this.db.collection<Comment>(`teams/${this.teamId}/notes/${note.id}/comments`, ref => ref.orderBy('timestamp')).stateChanges(['added', 'modified', 'removed'])
            .pipe(
                map(actions => actions.map(a => {
                    console.log('ACTION', a);
                    if (a.type == 'removed') {
                        ///remove based on file.id
                        const comment = a.payload.doc.data() as Comment;
                        comment.id = a.payload.doc.id;
                        note.comments.forEach((c) => {
                            if (c.id === comment.id) {
                                var index = note.comments.indexOf(c);
                                note.comments.splice(index, 1);
                                console.log("Removed note comment: ", c);
                            }
                        })
                    }
                    if (a.type == 'added' || a.type == 'modified') {
                        const comment = a.payload.doc.data() as Comment;
                        if (comment.timestamp) {
                            comment.id = a.payload.doc.id;
                            const exists = note.comments.find(c => c.id === comment.id)
                            if (comment.timestamp && !exists) {
                                comment.profile = this.membersService.getMember(comment.uid);
                                note.comments.push(comment);
                            } else if (comment.timestamp && exists) {
                                let commentIndex = note.comments.findIndex(c => c.id == comment.id);
                                comment.profile = note.comments[commentIndex].profile;
                                note.comments[commentIndex] = comment;
                            }
                        }
                    }
                })),
                shareReplay(1)
            ).subscribe();
    }

    getNote(id: string) {
        return this.store.select<Note[]>('notes')
            .pipe(
                filter(Boolean),
                map((note: Note[]) => note.find((note: Note) => note.id === id)));
    }

    checkLastNote(noteId: string) {
        return this.db.doc(`users/${this.uid}/teams/${this.teamId}`).set({
            unread: {
                [`${noteId}`]: {
                    unreadNotes: 0
                }
            }
        }, { merge: true });
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
            flag: false,
            profile: null,
            newComment: null
        }
        return this.db.collection<Note>(`teams/${this.teamId}/notes`).add(note);
    }

    async addComment(body: string, noteId) {
        const comment: Comment = {
            body: body,
            id: null,
            uid: this.uid,
            timestamp: firestore.FieldValue.serverTimestamp(),
            profile: null
        }
        await this.db.collection<Comment>(`teams/${this.teamId}/notes/${noteId}/comments`).add(comment);
        return this.db.doc<Note>(`teams/${this.teamId}/notes/${noteId}`).update({
            commentCount: firestore.FieldValue.increment(1)
        })
    }

    flagNote(note: Note) {
        return this.db.doc<Note>(`teams/${this.teamId}/notes/${note.id}`).update({
            flag: !note.flag
        });
    }

    removeNote(noteId: string) {
        return this.db.doc<Note>(`teams/${this.teamId}/notes/${noteId}`).delete();
    }

    async removeComment(noteId: string, commentId: string) {
        const noteDoc = this.db.doc<Note>(`teams/${this.teamId}/notes/${noteId}`);
        await noteDoc.update({
            commentCount: firestore.FieldValue.increment(-1)
        })
        const commentDoc = this.db.doc<Comment>(`teams/${this.teamId}/notes/${noteId}/comments/${commentId}`);
        return commentDoc.delete();
    }

}
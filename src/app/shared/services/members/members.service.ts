import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Router, RoutesRecognized } from '@angular/router';
import firebase from 'firebase/app';

import { Store } from 'src/store';
import { ProfileService, Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable } from 'rxjs';
import {
  tap,
  filter,
  map,
  shareReplay,
  switchMap
} from 'rxjs/operators';

import { Unread } from '../teams/teams.service';

export interface Member {
  status: string,
  uid: string,
  displayName?: string,
  email?: string,
  role?: string,
  url?: string,
  url_150?: string,
  unread: Unread,
  files: File[],
  messages: Message[],
  direct: Direct,
  isChecked: boolean,
  pending: any[];
}

export interface Direct {
  lastFile?: string,
  lastFileId?: string,
  lastFileUid?: string,
  lastMessage?: string,
  lastMessageId?: string,
  lastMessageUid?: string,
  members?: boolean,
  id?: string
}

export interface File {
  id: string,
  name: string,
  size: number,
  timestamp: firebase.firestore.FieldValue,
  type: string,
  uid: string,
  url: string,
  profile?: Observable<Member>,
  style?: string,
  updating?: boolean
}

export interface Message {
  body: string,
  type?: string,
  id?: string,
  uid: string,
  timestamp: firebase.firestore.FieldValue,
  profile?: Observable<Member>,
  style?: string,
  fileName?: string
}

@Injectable()
export class MembersService {
  private membersCol: AngularFirestoreCollection<Member>;
  private messagesCol: AngularFirestoreCollection<Message>;
  private filesCol: AngularFirestoreCollection<File>;
  private unreadUpdateDoc: AngularFirestoreDocument;
  private directDoc: AngularFirestoreDocument<Direct>;
  private pendingMembersCol: AngularFirestoreCollection<any>;
  unread$: Observable<Unread>;
  files$: Observable<Number[]>;
  messages$: Observable<Number[]>;
  direct$: Observable<Direct>;
  teamId: string;
  uid: string;
  pathId: string;
  members$: Observable<Member[]>;
  sanitizer = '/(<script(\s|\S)*?<\/script>)|(<style(\s|\S)*?<\/style>)|(<!--(\s|\S)*?-->)|(<\/?(\s|\S)*?>)/g';

  constructor(
    private store: Store,
    private db: AngularFirestore,
    private profileService: ProfileService,
    private storage: AngularFireStorage
  ) { }

  membersObservable(userId, teamId) {
    this.store.set('members', null);
    this.members$ = null;
    this.uid = userId;
    this.teamId = teamId;
    this.membersCol = this.db.collection<Member>(`teams/${this.teamId}/members`);
    this.members$ = this.membersCol.valueChanges()
      .pipe(
        tap(next => {
          next.forEach(member => {
            this.getFiles(member);
            this.getMessages(member);
            this.getDirect(member);
            this.getPending(member);
          })
          this.store.set('members', next)
        }),
        shareReplay(1)
      );
    return this.members$;
  }

  getFiles(member: Member) {
    member.files = [];
    if (member.uid !== this.uid) {
      this.pathId = this.uid < member.uid ? this.uid + member.uid : member.uid + this.uid;
      this.filesCol = this.db.collection<File>(`teams/${this.teamId}/direct/${this.pathId}/files`, ref => ref.orderBy('timestamp'));
    } else if (member.uid === this.uid) {
      this.filesCol = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`, ref => ref.orderBy('timestamp'));
    }
    this.filesCol.stateChanges(['added', 'modified', 'removed'])
      .pipe(
        map(actions => actions.map(a => {
          if (a.type == 'removed') {
            const file = a.payload.doc.data() as File;
            file.id = a.payload.doc.id;
            const removeFile = member.files.find((f: File) => f.id === file.id);
            const index = member.files.indexOf(removeFile);
            member.files.splice(index, 1);
          }
          if (a.type == 'added' || a.type == 'modified') {
            const file = a.payload.doc.data() as File;
            if (file.timestamp) {
              file.id = a.payload.doc.id;
              const exists = member.files.find(m => m.id === file.id)
              if (file.timestamp && !exists) {
                file.profile = this.getMember(file.uid);
                member.files.push(file);
              } else if (file.timestamp && exists) {
                let fileIndex = member.files.findIndex(m => m.id == file.id);
                file.profile = member.files[fileIndex].profile;
                member.files[fileIndex] = file;
              }
            }
          }
        })),
        shareReplay(1)
      ).subscribe();
  }

  getMessages(member: Member) {
    member.messages = [];
    this.pathId = this.uid < member.uid ? this.uid + member.uid : member.uid + this.uid;
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/direct/${this.pathId}/messages`, ref => ref.orderBy('timestamp'));
    this.messagesCol.stateChanges(['added', 'modified', 'removed'])
      .pipe(
        map(actions => actions.map(a => {
          if (a.type == 'removed') {
            ///remove based on file.id
            const message = a.payload.doc.data() as Message;
            message.id = a.payload.doc.id;
            member.messages.forEach(function (m) {
              if (m.id === message.id) {
                var index = member.messages.indexOf(message);
                member.messages.splice(index, 1);
              }
            })
          }
          if (a.type == 'added' || a.type == 'modified') {
            const message = a.payload.doc.data() as Message;
            if (message.timestamp) {
              message.id = a.payload.doc.id;
              const exists = member.messages.find(m => m.id === message.id)
              if (message.timestamp && !exists) {
                message.profile = this.getMember(message.uid);
                member.messages.push(message);
              } else if (message.timestamp && exists) {
                let messageIndex = member.messages.findIndex(m => m.id == message.id);
                message.profile = member.messages[messageIndex].profile;
                member.messages[messageIndex] = message;
              }
            }
          }
        })),
        shareReplay(1)
      ).subscribe();
  }

  getDirect(member: Member) {
    if (member.uid !== this.uid) {
      this.pathId = this.uid < member.uid ? this.uid + member.uid : member.uid + this.uid;
      this.directDoc = this.db.doc<Direct>(`teams/${this.teamId}/direct/${this.pathId}`);
      this.directDoc.valueChanges()
        .pipe(
          tap(next => {
            if (!next) {
              return;
            }
            member.direct = next;
          }),
          shareReplay(1)
        ).subscribe();
    } else {
      return;
    }
  }

  getPending(member: Member) {
    if (member.status == 'Admin' && member.uid == this.uid) {
      member.pending = [];
      this.pendingMembersCol = this.db.collection(`teams/${this.teamId}/pendingMembers`)
      this.pendingMembersCol.valueChanges()
        .pipe(
          tap(next => {
            if (!next) {
              return;
            }
            member.pending = next;
          }),
          shareReplay(1)
        ).subscribe();
    } else {
      return;
    }
  }

  getMember(uid: string) {
    return this.store.select<Member[]>('members')
      .pipe(
        filter(Boolean),
        map((member: Member[]) => member.find((member: Member) => member.uid === uid)));
  }

  checkLastMessage(memberUid: string) {
    const pathId = this.uid < memberUid ? this.uid + memberUid : memberUid + this.uid;
    return this.db.doc(`users/${this.uid}/teams/${this.teamId}`).set({
      unread: {
        [`${pathId}`]: {
          unreadMessages: 0
        }
      }
    }, { merge: true });
  }

  checkLastFile(memberUid: string) {
    const pathId = this.uid < memberUid ? this.uid + memberUid : memberUid + this.uid;
    return this.db.doc(`users/${this.uid}/teams/${this.teamId}`).set({
      unread: {
        [`${pathId}`]: {
          unreadFiles: 0
        }
      }
    }, { merge: true });
  }

  async removeFile(memberUid, fileId, fileUrl) {
    console.log('removing', memberUid, fileId);
    if (memberUid !== this.uid) {
      const pathId = this.uid < memberUid ? this.uid + memberUid : memberUid + this.uid;
      this.filesCol = this.db.collection<File>(`teams/${this.teamId}/direct/${pathId}/files`);
      await this.filesCol.doc(fileId).delete();
      return this.storage.storage.refFromURL(fileUrl).delete()
    } else {
      this.filesCol = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
      await this.filesCol.doc(fileId).delete();
      return this.storage.storage.refFromURL(fileUrl).delete()
    }
  }

  async addMessage(body: string, directId: string, style: string, fileName: string) {
    const message: Message = {
      body: body,
      uid: this.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      style: style,
      fileName: fileName
    }
    const pathId = this.uid < directId ? this.uid + directId : directId + this.uid;
    const messagesCol = this.db.collection<Message>(`teams/${this.teamId}/direct/${pathId}/messages`);
    try {
      return messagesCol.add(message);
    } catch (err) {
      console.log(err.message);
      return false;
    }
  }

  removeMember(removeId) {
    this.membersCol = this.db.collection(`teams/${this.teamId}/members`);
    return this.membersCol.doc(removeId).delete();
  }

  removePendingMember(removePending) {
    if (!removePending.profile) {
      this.pendingMembersCol = this.db.collection(`teams/${this.teamId}/pendingMembers`, ref => ref.where('email', '==', removePending.email));
      this.pendingMembersCol.valueChanges({ idField: 'id' })
        .pipe(tap(next => {
          if (!next) {
            return;
          }
          return next.forEach(pendingMemberDoc => {
            this.pendingMembersCol.doc(pendingMemberDoc.id).delete();
          })
        })).subscribe();
    } else {
      this.pendingMembersCol = this.db.collection(`teams/${this.teamId}/pendingMembers`);
      return this.pendingMembersCol.doc(removePending.uid).delete();
    }
  }

  addMember(pendingEmail) {
    this.pendingMembersCol = this.db.collection(`teams/${this.teamId}/pendingMembers`)
    return this.pendingMembersCol.add({ email: pendingEmail });
  }

  async updateMembers(newMembers, removeMembers, removePendingMembers) {
    try {
      await newMembers.forEach(n => {
        if (n) {
          this.addMember(n);
        }
      })
      await removeMembers.forEach(r => {
        if (r) {
          this.removeMember(r);
        }
      })
      return removePendingMembers.forEach(p => {
        if (p) {
          this.removePendingMember(p);
        }
      })
    } catch (err) {
      console.log(err);
    }
  }

}
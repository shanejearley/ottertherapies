import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Router, RoutesRecognized } from '@angular/router';
import { firestore } from 'firebase/app';

import { Store } from 'src/store';
import { ProfileService, Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable, Subscription } from 'rxjs';
import {
  tap,
  filter,
  map,
  switchMap,
  find
} from 'rxjs/operators';
import { of, empty } from 'rxjs';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';

export interface Member {
  status: string,
  uid: string,
  profile: Profile,
  unread: Unread,
  files: File[],
  messages: Message[],
  direct: Direct,
  isChecked: boolean
}

export interface Direct {
  lastFile: string,
  lastFileId: string,
  lastFileUid: string,
  lastMessage: string,
  lastMessageId: string,
  lastMessageUid: string,
  members: boolean,
  id: string
}

export interface Unread {
  unreadMessages: number,
  unreadFiles: number,
  unreadNotes: number
}

export interface File {
  id: string,
  name: string,
  size: number,
  timestamp: firestore.FieldValue,
  type: string,
  uid: string,
  url: string,
  profile: Profile
}

export interface Message {
  body: string,
  id: string,
  uid: string,
  timestamp: firestore.FieldValue,
  profile: Profile
}

@Injectable()
export class MembersService {
  private membersCol: AngularFirestoreCollection<Member>;
  private messagesCol: AngularFirestoreCollection<Message>;
  private filesCol: AngularFirestoreCollection<File>;
  private unreadDoc: AngularFirestoreDocument<Unread>;
  private unreadUpdateDoc: AngularFirestoreDocument;
  private directDoc: AngularFirestoreDocument<Direct>;
  unread$: Observable<Unread>;
  files$: Observable<Number[]>;
  messages$: Observable<Number[]>;
  direct$: Observable<Direct>;
  teamId: string;
  uid: string;
  pathId: string;
  members$: Observable<Member[]>;

  constructor(
    private store: Store,
    private db: AngularFirestore,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private storage: AngularFireStorage,
  ) {}

  membersObservable(userId, teamId) {
    this.uid = userId;
    this.teamId = teamId;
    this.membersCol = this.db.collection<Member>(`teams/${this.teamId}/members`);
    this.members$ = this.membersCol.valueChanges()
      .pipe(tap(next => {
        next.forEach(member => {
          this.profileService.getProfile(member);
          this.getUnread(member);
          this.getFiles(member);
          this.getMessages(member);
          this.getDirect(member);
        })
        this.store.set('members', next)
      }));
    return this.members$;
  }

  getUnread(member: Member) {
    if (member.uid !== this.uid) {
      this.pathId = this.uid < member.uid ? this.uid + member.uid : member.uid + this.uid;
      this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${this.pathId}`);
      this.unreadDoc.valueChanges()
        .pipe(tap(next => {
          if (!next) {
            return;
          }
          member.unread = next;
        })).subscribe();
    } else {
      return;
    }
  }

  getFiles(member: Member) {
    member.files = [];
    if (member.uid !== this.uid) {
      this.pathId = this.uid < member.uid ? this.uid + member.uid : member.uid + this.uid;
      this.filesCol = this.db.collection<File>(`teams/${this.teamId}/direct/${this.pathId}/files`);
      this.filesCol.stateChanges(['added', 'modified', 'removed'])
      .pipe(map(actions => actions.map(a => {
        console.log('ACTION', a);
        if (a.type == 'removed') {
          const file = a.payload.doc.data() as File;
          file.id = a.payload.doc.id;
          member.files.forEach(function(m) {
            if (m.id === file.id) {
              var index = member.files.indexOf(file);
              member.files.splice(index, 1);
              console.log("Removed member file: ", file);
            }
          })
        }
        if (a.type == 'added' || a.type == 'modified') {
          const file = a.payload.doc.data() as File;
          if (file.timestamp) {
            file.id = a.payload.doc.id;
            this.getMember(file.uid).subscribe(m => { 
              file.profile = m.profile;
              member.files.push(file);
            })
          }
        }
      }))).subscribe();
    } else {
      this.filesCol = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
      this.filesCol.stateChanges(['added', 'modified', 'removed'])
      .pipe(map(actions => actions.map(a => {
        console.log('ACTION', a);
        if (a.type == 'removed') {
          const file = a.payload.doc.data() as File;
          file.id = a.payload.doc.id;
          member.files.forEach(function(m) {
            if (m.id === file.id) {
              var index = member.files.indexOf(file);
              member.files.splice(index, 1);
              console.log("Removed member file: ", file);
            }
          })
        }
        if (a.type == 'added' || a.type == 'modified') {
          const file = a.payload.doc.data() as File;
          if (file.timestamp) {
            file.id = a.payload.doc.id;
            this.getMember(file.uid).subscribe(m => { 
              file.profile = m.profile;
              member.files.push(file);
            })
          }
        }
      }))).subscribe();
    }
  }

  getMessages(member: Member) {
    member.messages = [];
    this.pathId = this.uid < member.uid ? this.uid + member.uid : member.uid + this.uid;
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/direct/${this.pathId}/messages`, ref => ref.orderBy('timestamp'));
    this.messagesCol.stateChanges(['added', 'modified', 'removed'])
    .pipe(map(actions => actions.map(a => {
      console.log('ACTION', a);
      if (a.type == 'removed') {
        ///remove based on file.id
        const message = a.payload.doc.data() as Message;
        message.id = a.payload.doc.id;
        member.messages.forEach(function(m) {
          if (m.id === message.id) {
            var index = member.messages.indexOf(message);
            member.messages.splice(index, 1);
            console.log("Removed member message: ", message);
          }
        })
      }
      if (a.type == 'added' || a.type == 'modified') {
        const message = a.payload.doc.data() as Message;
        if (message.timestamp) {
          message.id = a.payload.doc.id;
          this.getMember(message.uid).subscribe(m => { 
            message.profile = m.profile;
            member.messages.push(message);
          })
        }
      }
    }))).subscribe();
  }

  getDirect(member: Member) {
    if (member.uid !== this.uid) {
      this.pathId = this.uid < member.uid ? this.uid + member.uid : member.uid + this.uid;
      this.directDoc = this.db.doc<Direct>(`teams/${this.teamId}/direct/${this.pathId}`);
      this.directDoc.valueChanges()
        .pipe(tap(next => {
          if (!next) {
            return;
          }
          member.direct = next;
        })).subscribe();
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
    this.pathId = this.uid < memberUid ? this.uid + memberUid : memberUid + this.uid;
    this.unreadUpdateDoc = this.db.doc(`users/${this.uid}/teams/${this.teamId}/unread/${this.pathId}`);
    this.unreadUpdateDoc.set({
      unreadMessages: 0
    }, {merge:true});
  }

  checkLastFile(memberUid: string) {
    this.pathId = this.uid < memberUid ? this.uid + memberUid : memberUid + this.uid;
    this.unreadUpdateDoc = this.db.doc(`users/${this.uid}/teams/${this.teamId}/unread/${this.pathId}`);
    this.unreadUpdateDoc.set({
      unreadFiles: 0
    }, {merge:true});
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

  addMessage(body: string, directId: string) {
    const message: Message = {
      body: body,
      uid: this.uid,
      timestamp: firestore.FieldValue.serverTimestamp(),
      id: null,
      profile: null
    }
    this.pathId = this.uid < directId ? this.uid + directId : directId + this.uid;
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/direct/${this.pathId}/messages`);
    this.directDoc = this.db.doc<Direct>(`teams/${this.teamId}/direct/${this.pathId}`);
    this.messagesCol.add(message).then((messageRef) => {
      this.directDoc.update({
        lastMessage: body,
        lastMessageId: messageRef.id,
        lastMessageUid: message.uid
      })
    });
  }

}
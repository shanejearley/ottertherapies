import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Router, RoutesRecognized } from '@angular/router';
import { firestore } from 'firebase/app';
import 'firebase/storage';

import { Store } from 'src/store';
import { Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable } from 'rxjs';
import { tap, filter, map } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';
import { MembersService } from '../members/members.service';

export interface Group {
  createdBy: string,
  id: string,
  lastFile: string,
  lastFileId: string,
  lastFileUid: string,
  lastMessage: string,
  lastMessageId: string,
  lastMessageUid: string,
  name: string,
  timestamp: firestore.FieldValue,
  unread: Unread,
  files: File[],
  messages: Message[],
  isChecked: boolean,
  members: Member[];
}

export interface Member {
  status: string,
  uid: string,
  profile: Profile
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
export class GroupsService {
  private membersCol: AngularFirestoreCollection<Member>;
  private groupsCol: AngularFirestoreCollection<Group>;
  private filesCol: AngularFirestoreCollection<File>;
  private messagesCol: AngularFirestoreCollection<Message>;
  private groupDoc: AngularFirestoreDocument<Group>;
  private unreadDoc: AngularFirestoreDocument<Unread>;
  private unreadUpdateDoc: AngularFirestoreDocument;
  private fileDoc: AngularFirestoreDocument<File>;
  members$;
  unread$: Observable<Unread>;
  group$: Observable<Group>;
  files$: Observable<Number[]>;
  messages$: Observable<Number[]>;
  teamId: string;
  uid: string;
  groups$: Observable<Group[]>;
  message: Message;

  constructor(
    private store: Store,
    private db: AngularFirestore,
    private storage: AngularFireStorage,
    private authService: AuthService,
    private membersService: MembersService,
    private router: Router,

  ) { }

  groupsObservable(userId, teamId) {
    this.uid = userId;
    this.teamId = teamId;
    this.groupsCol = this.db.collection<Group>(`users/${this.uid}/teams/${this.teamId}/groups`);
    this.groups$ = this.groupsCol.valueChanges({ idField: 'id' })
      .pipe(tap(next => {
        next.forEach(group => {
          this.getInfo(group);
          this.getMembers(group);
          this.getUnread(group);
          this.getFiles(group);
          this.getMessages(group);
        })
        this.store.set('groups', next)
      }));
    return this.groups$;
  }

  async getInfo(group: Group) {
    this.groupDoc = this.db.doc<Group>(`teams/${this.teamId}/groups/${group.id}`);
    this.groupDoc.valueChanges()
      .pipe(tap(next => {
        if (!next) {
          return;
        }
        group.createdBy = next.createdBy
        group.lastFile = next.lastFile
        group.lastFileId = next.lastFileId
        group.lastFileUid = next.lastFileUid
        group.lastMessage = next.lastMessage
        group.lastMessageId = next.lastMessageId
        group.lastMessageUid = next.lastMessageUid
        group.name = next.name
        group.timestamp = next.timestamp
      })).subscribe();
  }

  getMembers(group: Group) {
    group.members = [];
    this.membersCol = this.db.collection<Member>(`teams/${this.teamId}/groups/${group.id}/members`);
    this.membersCol.stateChanges(['added', 'modified', 'removed'])
      .pipe(map(actions => actions.map(a => {
        if (a.type == 'removed') {
          const member = a.payload.doc.data() as Member;
          member.uid = a.payload.doc.id;
        }
        if (a.type == 'added' || a.type == 'modified') {
          const member = a.payload.doc.data() as Member;
          member.uid = a.payload.doc.id;
          const exists = group.members.find(m => m.uid === member.uid)
          if (!exists) {
            this.membersService.getMember(member.uid).subscribe(m => { 
              member.profile = m.profile;
              group.members.push(member);
            })
          } else {
            let memberIndex = group.members.findIndex(m => m.uid == member.uid);
            this.membersService.getMember(member.uid).subscribe(m => { 
              member.profile = m.profile;
              group.members[memberIndex] = member;
            })
          }
        }
      }))).subscribe();
  }

  getUnread(group: Group) {
    this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${group.id}`);
    try {
      this.unreadDoc.valueChanges()
        .pipe(tap(next => {
          if (!next) {
            return;
          }
          group.unread = next;
        })).subscribe();
    } catch (err) {
      console.log(err);
      return;
    }
  }

  /// need to modifiy this to stateChages as it is below!
  getFiles(group: Group) {
    group.files = [];
    this.filesCol = this.db.collection<File>(`teams/${this.teamId}/groups/${group.id}/files`);
    try {
      this.filesCol.stateChanges(['added', 'modified', 'removed'])
        .pipe(map(actions => actions.map(a => {
          const file = a.payload.doc.data() as File;
          file.id = a.payload.doc.id;
          if (a.type == 'removed') {
            ///remove based on file.id
            group.files.forEach(function (f) {
              if (f.id === file.id) {
                var index = group.files.indexOf(file);
                group.files.splice(index, 1);
                console.log("Removed group file: ", file);
              }
            })
          }
          if (a.type == 'added' || a.type == 'modified') {
            if (file.timestamp) {
              console.log('file', file);
              this.membersService.getMember(file.uid).subscribe(m => { 
                file.profile = m.profile;
                group.files.push(file);
              })
            }
          }
        }))).subscribe();
    } catch (err) {
      console.log(err);
      return;
    }
  }

  getMessages(group: Group) {
    group.messages = [];
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/groups/${group.id}/messages`, ref => ref.orderBy('timestamp'));
    try {
      this.messagesCol.stateChanges(['added', 'modified', 'removed'])
        .pipe(map(actions => actions.map(a => {
          console.log('ACTION', a);
          if (a.type == 'removed') {
            ///remove based on file.id
            const message = a.payload.doc.data() as Message;
            message.id = a.payload.doc.id;
            group.messages.forEach(function (m) {
              if (m.id === message.id) {
                var index = group.messages.indexOf(message);
                group.messages.splice(index, 1);
                console.log("Removed group message: ", message);
              }
            })
          }
          if (a.type == 'added' || a.type == 'modified') {
            const message = a.payload.doc.data() as Message;
            if (message.timestamp) {
              message.id = a.payload.doc.id;
              this.membersService.getMember(message.uid).subscribe(m => { 
                if (m.profile) {
                  message.profile = m.profile;
                  group.messages.push(message);
                }
              })
            }
          }
        }))).subscribe();
    } catch (err) {
      console.log(err);
      return;
    }
  }

  getGroup(id: string) {
    return this.store.select<Group[]>('groups')
      .pipe(
        filter(Boolean),
        map((group: Group[]) => group.find((group: Group) => group.id === id)));
  }

  checkLastMessage(groupId: string) {
    this.unreadUpdateDoc = this.db.doc(`users/${this.uid}/teams/${this.teamId}/unread/${groupId}`);
    this.unreadUpdateDoc.set({
      unreadMessages: 0,
    }, { merge: true });
  }

  checkLastFile(groupId: string) {
    this.unreadUpdateDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${groupId}`);
    this.unreadUpdateDoc.set({
      unreadFiles: 0
    }, { merge: true });
  }

  async removeFile(groupId, fileId, fileUrl) {
    console.log('removing', groupId, fileId);
    this.filesCol = this.db.collection<File>(`teams/${this.teamId}/groups/${groupId}/files`);
    await this.filesCol.doc(fileId).delete();
    return this.storage.storage.refFromURL(fileUrl).delete()
  }

  addMessage(body: string, groupId: string) {
    const message: Message = {
      body: body,
      uid: this.uid,
      timestamp: firestore.FieldValue.serverTimestamp(),
      id: null,
      profile: null
    }
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/groups/${groupId}/messages`);
    this.groupDoc = this.db.doc<Group>(`teams/${this.teamId}/groups/${groupId}`);
    this.messagesCol.add(message).then((messageRef) => {
      this.groupDoc.update({
        lastMessage: body,
        lastMessageId: messageRef.id,
        lastMessageUid: message.uid
      })
    });
  }

  addGroup(group) {
    const newGroup = {
      createdBy: this.uid,
      id: null,
      lastFile: null,
      lastFileId: null,
      lastFileUid: null,
      lastMessage: null,
      lastMessageId: null,
      lastMessageUid: null,
      name: group.name,
      timestamp: firestore.FieldValue.serverTimestamp(),
      unread: null,
      files: null,
      messages: null,
      isChecked: false,
      members: null
    }
    this.groupsCol = this.db.collection<Group>(`teams/${this.teamId}/groups`);
    return this.groupsCol.add(newGroup).then(async docRef => {
      this.membersCol = this.db.collection(`teams/${this.teamId}/groups/${docRef.id}/members`);
      await this.membersCol.doc(this.uid).set({
        uid: this.uid,
        status: "Admin"
      }, { merge: true })
      return group.members.forEach(m => {
        if (m.uid !== this.uid) {
          return this.membersCol.doc(m.uid).set({
            uid: m.uid,
            status: "Member"
          }, { merge: true })
        }
      })
    });
  }

  removeMember(groupId: string, uid: string) {
    this.membersCol = this.db.collection(`teams/${this.teamId}/groups/${groupId}/members`);
    return this.membersCol.doc(uid).delete();
  }

  updateGroup(group, remove) {
    const updateGroup = {
      createdBy: this.uid,
      id: null,
      name: group.name,
    }
    this.groupsCol = this.db.collection<Group>(`teams/${this.teamId}/groups`);
    return this.groupsCol.doc(group.id).update(updateGroup).then(() => {
      this.membersCol = this.db.collection(`teams/${this.teamId}/groups/${group.id}/members`);
      if (remove.length) {
        return remove.forEach(r => {
          return this.removeMember(group.id, r);
        })
      }
      if (group.members.length) {
        return group.members.forEach(m => {
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
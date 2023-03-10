import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Router, RoutesRecognized } from '@angular/router';
import firebase from 'firebase/app';
import 'firebase/storage';

import { Store } from 'src/store';
import { Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable } from 'rxjs';
import { tap, filter, map, shareReplay } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';
import { MembersService, Member } from '../members/members.service';
import { Unread } from '../teams/teams.service';

export interface Group {
  createdBy: string,
  id: string,
  lastFile?: string,
  lastFileId?: string,
  lastFileUid?: string,
  lastMessage?: string,
  lastMessageId?: string,
  lastMessageUid?: string,
  name: string,
  timestamp: firebase.firestore.FieldValue,
  unread?: Unread,
  files?: File[],
  messages?: Message[],
  isChecked?: boolean,
  members?: GroupMember[];
}

export interface GroupMember {
  status: string,
  uid: string,
  profile: Observable<Member>
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
export class GroupsService {
  private membersCol: AngularFirestoreCollection<GroupMember>;
  private groupsCol: AngularFirestoreCollection<Group>;
  private filesCol: AngularFirestoreCollection<File>;
  private messagesCol: AngularFirestoreCollection<Message>;
  private groupDoc: AngularFirestoreDocument<Group>;
  private unreadUpdateDoc: AngularFirestoreDocument;
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
    private membersService: MembersService,
  ) { }

  groupsObservable(userId, teamId) {
    this.uid = userId;
    this.teamId = teamId;
    this.groupsCol = this.db.collection<Group>(`users/${this.uid}/teams/${this.teamId}/groups`);
    this.groups$ = this.groupsCol.valueChanges({ idField: 'id' })
      .pipe(
        tap(next => {
          next.forEach(group => {
            this.getInfo(group);
            this.getMembers(group);
            this.getFiles(group);
            this.getMessages(group);
          })
          this.store.set('groups', next)
        }),
        shareReplay(1)
      );
    return this.groups$;
  }

  async getInfo(group: Group) {
    this.groupDoc = this.db.doc<Group>(`teams/${this.teamId}/groups/${group.id}`);
    this.groupDoc.valueChanges()
      .pipe(
        tap(next => {
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
        }),
        shareReplay(1)
      ).subscribe();
  }

  getMembers(group: Group) {
    group.members = [];
    this.membersCol = this.db.collection<GroupMember>(`teams/${this.teamId}/groups/${group.id}/members`);
    this.membersCol.stateChanges(['added', 'modified', 'removed'])
      .pipe(
        map(actions => actions.map(a => {
          if (a.type == 'removed') {
            const member = a.payload.doc.data() as GroupMember;
            member.uid = a.payload.doc.id;
            const removeMember = group.members.find(m => m.uid === member.uid);
            const index = group.members.indexOf(removeMember);
            console.log('removing group member at index ', index);
            return group.members.splice(index, 1);
          }
          if (a.type == 'added' || a.type == 'modified') {
            const member = a.payload.doc.data() as GroupMember;
            member.uid = a.payload.doc.id;
            const exists = group.members.find(m => m.uid === member.uid)
            if (!exists) {
              member.profile = this.membersService.getMember(member.uid);
              group.members.push(member);
            } else {
              let memberIndex = group.members.findIndex(m => m.uid == member.uid);
              member.profile = this.membersService.getMember(member.uid);
              group.members[memberIndex] = member;
            }
          }
        })),
        shareReplay(1)
      ).subscribe();
  }

  /// need to modifiy this to stateChages as it is below!
  getFiles(group: Group) {
    group.files = [];
    this.filesCol = this.db.collection<File>(`teams/${this.teamId}/groups/${group.id}/files`);
    try {
      this.filesCol.stateChanges(['added', 'modified', 'removed'])
        .pipe(
          map(actions => actions.map(a => {
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
                const exists = group.files.find(f => f.id === file.id)
                if (file.timestamp && !exists) {
                  file.profile = this.membersService.getMember(file.uid);
                  group.files.push(file);
                } else if (file.timestamp && exists) {
                  let fileIndex = group.files.findIndex(f => f.id == file.id);
                  file.profile = this.membersService.getMember(file.uid);
                  group.files[fileIndex] = file;
                }
              }
            }
          })),
          shareReplay(1)
        ).subscribe();
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
        .pipe(
          map(actions => actions.map(a => {
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
                const exists = group.messages.find(m => m.id === message.id)
                if (message.timestamp && !exists) {
                  message.profile = this.membersService.getMember(message.uid);
                  group.messages.push(message);
                } else if (message.timestamp && exists) {
                  let messageIndex = group.messages.findIndex(m => m.id == message.id);
                  message.profile = this.membersService.getMember(message.uid);
                  group.messages[messageIndex] = message;
                }
              }
            }
          })),
          shareReplay(1)
        ).subscribe();
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

  async removeGroup(groupId: string) {
    const groupDoc = this.db.doc<Group>(`teams/${this.teamId}/groups/${groupId}`);
    return groupDoc.delete();
  }

  checkLastMessage(groupId: string) {
    return this.db.doc(`users/${this.uid}/teams/${this.teamId}`).set({
      unread: {
        [`${groupId}`]: {
          unreadMessages: 0
        }
      }
    })
  }

  checkLastFile(groupId: string) {
    return this.db.doc(`users/${this.uid}/teams/${this.teamId}`).set({
      unread: {
        [`${groupId}`]: {
          unreadFiles: 0
        }
      }
    })
  }

  async removeFile(groupId, fileId, fileUrl) {
    console.log('removing', groupId, fileId);
    this.filesCol = this.db.collection<File>(`teams/${this.teamId}/groups/${groupId}/files`);
    await this.filesCol.doc(fileId).delete();
    return this.storage.storage.refFromURL(fileUrl).delete()
  }

  async addMessage(body: string, groupId: string, style: string, fileName: string) {
    const message: Message = {
      body: body,
      uid: this.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      style: style,
      fileName: fileName
    }
    const messagesCol = this.db.collection<Message>(`teams/${this.teamId}/groups/${groupId}/messages`);
    const groupDoc = this.db.doc<Group>(`teams/${this.teamId}/groups/${groupId}`);
    try {
      const messageRef = await messagesCol.add(message);
      return groupDoc.update({
        lastMessage: style === 'message' ? message.body : 'Attachment: 1 File',
        lastMessageId: messageRef.id,
        lastMessageUid: message.uid
      })
    } catch (err) {
      console.log(err.message);
      return false;
    }
  }

  async addGroup(groupId, group) {
    const newGroup = {
      createdBy: this.uid,
      id: groupId,
      name: group.name,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      isChecked: false,
    }
    this.groupsCol = this.db.collection<Group>(`teams/${this.teamId}/groups`);
    await this.groupsCol.doc(groupId).set(newGroup, { merge: true })
    this.membersCol = this.db.collection(`teams/${this.teamId}/groups/${groupId}/members`);
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
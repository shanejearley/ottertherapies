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

export interface Group {
  createdBy: string,
  id: string,
  lastFile: string,
  lastFileId: string,
  lastFileUid: string,
  lastMessage: string,
  lastMessageId: string,
  lastMessageUid: string,
  memberCount: number,
  name: string,
  timestamp: firestore.FieldValue,
  unread: Unread,
  files: File[],
  messages: Message[],
  isChecked: boolean
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
  private groupsCol: AngularFirestoreCollection<Group>;
  private filesCol: AngularFirestoreCollection<File>;
  private messagesCol: AngularFirestoreCollection<Message>;
  private groupDoc: AngularFirestoreDocument<Group>;
  private unreadDoc: AngularFirestoreDocument<Unread>;
  private fileDoc: AngularFirestoreDocument<File>;
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
    private profileService: ProfileService,
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
    this.group$ = this.groupDoc.valueChanges()
      .pipe(tap(next => {
        if (!next) {
          return;
        }
        group.createdBy = next.createdBy
        group.id = next.id
        group.lastFile = next.lastFile
        group.lastFileId = next.lastFileId
        group.lastFileUid = next.lastFileUid
        group.lastMessage = next.lastMessage
        group.lastMessageId = next.lastMessageId
        group.lastMessageUid = next.lastMessageUid
        group.memberCount = next.memberCount
        group.name = next.name
        group.timestamp = next.timestamp
      }))
    this.group$.subscribe();
  }

  getUnread(group: Group) {
    this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${group.id}`);
    this.unread$ = this.unreadDoc.valueChanges()
      .pipe(tap(next => {
        if (!next) {
          return;
        }
        group.unread = next;
      }))
    this.unread$.subscribe();
  }

  /// need to modifiy this to stateChages as it is below!
  getFiles(group: Group) {
    group.files = [];
    this.filesCol = this.db.collection<File>(`teams/${this.teamId}/groups/${group.id}/files`);
    this.files$ = this.filesCol.stateChanges(['added', 'modified', 'removed'])
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
            this.profileService.getProfile(file);
            return group.files.push(file);
          }
        }
      })))
    this.files$.subscribe();
  }

  getMessages(group: Group) {
    group.messages = [];
    this.messagesCol = this.db.collection<Message>(`teams/${this.teamId}/groups/${group.id}/messages`, ref => ref.orderBy('timestamp'));
    this.messages$ = this.messagesCol.stateChanges(['added', 'modified', 'removed'])
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
            this.profileService.getProfile(message);
            return group.messages.push(message);
          }
        }
      })))
    this.messages$.subscribe();
  }

  getGroup(id: string) {
    return this.store.select<Group[]>('groups')
      .pipe(
        filter(Boolean),
        map((group: Group[]) => group.find((group: Group) => group.id === id)));
  }

  checkLastMessage(groupId: string) {
    this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${groupId}`);
    this.unreadDoc.update({
      unreadMessages: 0
    });
  }

  checkLastFile(groupId: string) {
    this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${this.teamId}/unread/${groupId}`);
    this.unreadDoc.update({
      unreadFiles: 0
    });
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

  //   getMeal(key: string) {
  //     if (!key) return Observable.of({});
  //     return this.store.select<Meal[]>('meals')
  //       .filter(Boolean)
  //       .map(meals => meals.find((meal: Meal) => meal.$key === key));
  //   }

  //   addMeal(meal: Meal) {
  //     return this.db.list(`meals/${this.uid}`).push(meal);
  //   }

  //   updateMeal(key: string, meal: Meal) {
  //     return this.db.object(`meals/${this.uid}/${key}`).update(meal);
  //   }

  //   removeMeal(key: string) {
  //     return this.db.list(`meals/${this.uid}`).remove(key);
  //   }

}
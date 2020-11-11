import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import firebase from 'firebase/app';

import { AngularFireStorage } from '@angular/fire/storage';
import 'firebase/storage';

import { Store } from 'src/store';

import { Observable } from 'rxjs';
import {
  tap,
  filter,
  map,
  shareReplay,
  take
} from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';
import { GroupsService } from '../groups/groups.service';
import { MembersService, Member } from '../members/members.service';
import { NotesService } from '../notes/notes.service';
import { Profile } from 'src/auth/shared/services/profile/profile.service';

export interface Team {
  id?: string,
  name: string,
  publicId: string,
  child: string,
  bio?: string,
  url?: string,
  url_150_temp?: string,
  url_150?: string,
  createdBy: string,
  unread?: Unread[],
  unreadMessages?: number,
  unreadFiles?: number,
  unreadNotes?: number
}

export interface Unread {
  unreadMessages: number,
  unreadFiles: number,
  unreadNotes: number,
  id: string
}

@Injectable()
export class TeamsService {
  private teamsCol: AngularFirestoreCollection<Team>;
  private teamDoc: AngularFirestoreDocument<Team>;
  private userTeamDoc: AngularFirestoreDocument;
  private userDoc: AngularFirestoreDocument;
  private teamMembersCol: AngularFirestoreCollection;
  private pendingMembersCol: AngularFirestoreCollection;
  private groupDoc: AngularFirestoreDocument;
  private groupMembersCol: AngularFirestoreCollection;
  unreads$: Observable<Unread[]>;
  unread$: Observable<Unread>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  badgeTotal: number;
  uid: string;
  email: string;

  constructor(
    private storage: AngularFireStorage,
    private store: Store,
    private db: AngularFirestore,
    private authService: AuthService,
    private groupsService: GroupsService,
    private membersService: MembersService,
    private notesService: NotesService
  ) { }

  teamsObservable(userId: string) {
    this.teamsCol = this.db.collection<Team>(`users/${userId}/teams`);
    this.teams$ = this.teamsCol.valueChanges({ idField: 'id' })
      .pipe(
        tap(next => {
          console.log("next");
          next.forEach(team => {
            this.getInfo(team, userId);
            this.getUnread(team);
            console.log('team with unread ', team)
          })
          this.store.set('teams', next)
        }),
        shareReplay(1)
      );
    return this.teams$;
  }

  async getInfo(team: Team, uid: string) {
    this.team$ = this.db.doc<Team>(`teams/${team.id}`).valueChanges()
      .pipe(
        tap(async next => {
          console.log('TEAM INFO UPDATE');
          team.name = next.name
          team.publicId = next.publicId
          team.child = next.child
          team.bio = next.bio
          team.url = next.url
          team.url_150_temp = next.url_150_temp
          team.url_150 = next.url_150
          team.createdBy = next.createdBy
          team.unread = next.unread
          if (next.url_150_temp && !next.url_150) {
            const member = await this.db.doc(`teams/${team.id}/members/${uid}`).valueChanges().pipe(filter(Boolean), take(1), map((member: Member) => member)).toPromise();
            if (member && member.status === 'Admin') {
              const urlRef = this.storage.storage.refFromURL(next.url_150_temp);
              let fbUrl = await urlRef.getDownloadURL();
              if (fbUrl) { await this.db.doc<Team>(`teams/${team.id}`).update({ url_150: fbUrl }); };
              console.log('updated temp to reg');
              fbUrl = null;
            }
          }
        }),
        shareReplay(1)
      )
    this.team$.subscribe();
  }

  async getUnread(team) {
    this.uid = (await this.authService.user).uid;
    this.email = (await this.authService.user).email;
    console.log('UNREAD DOC FOR TEAM', team.unread);
    if (team.unread) {
      team.unreadMessages = 0;
      team.unreadFiles = 0;
      team.unreadNotes = 0;
      team.unread = Object.keys(team.unread).map(i => {
        return Object.assign(team.unread[i], { id: i });
      })
      team.unread.map(unread => {
        console.log('UNREAD OBJ', unread);
        let memberUid: string;
        if (unread.id.length == 56) {
          memberUid = unread.id.substr(0, 28) !== this.uid ? unread.id.substr(0, 28) : unread.id.substr(28, 28);
        }
        this.groupsService.getGroup(unread.id).subscribe(g => {
          if (g) {
            g.unread = unread;
          }
        })
        this.membersService.getMember(memberUid).subscribe(m => {
          if (m) {
            m.unread = unread;
          }
        })
        this.notesService.getNote(unread.id).subscribe(n => {
          if (n) {
            n.unread = unread;
          }
        })
        team.unreadMessages += unread.unreadMessages ? unread.unreadMessages : 0;
        team.unreadFiles += unread.unreadFiles ? unread.unreadFiles : 0;
        team.unreadNotes += unread.unreadNotes ? unread.unreadNotes : 0;
      });
    }
  }

  getTeam(id: string) {
    return this.store.select<Team[]>('teams')
      .pipe(
        filter(Boolean),
        map((teams: Team[]) => teams.find((team: Team) => team.id === id)));
  }

  async addTeam(newTeamId, childName, emails) {
    this.uid = (await this.authService.user).uid;
    this.email = (await this.authService.user).email;
    
    const newGroupId = this.db.createId();
    this.teamDoc = this.db.doc<Team>(`teams/${newTeamId}`);
    this.teamMembersCol = this.db.collection(`teams/${newTeamId}/members`);
    this.pendingMembersCol = this.db.collection(`teams/${newTeamId}/pendingMembers`)
    this.groupDoc = this.db.doc(`teams/${newTeamId}/groups/${newGroupId}`);
    this.groupMembersCol = this.db.collection(`teams/${newTeamId}/groups/${newGroupId}/members`);
    this.userTeamDoc = this.db.doc(`users/${this.uid}/teams/${newTeamId}`);
    this.userDoc = this.db.doc(`users/${this.uid}`);
    try {
      const profile$ = this.store.select('profile');
      const profile = await profile$.pipe(filter(Boolean), take(1), map((profile: Profile) => profile)).toPromise();
      await this.teamDoc.set({
        name: childName + "'s Care Team",
        publicId: childName + '-' + newTeamId.slice(-4),
        child: childName,
        createdBy: this.uid
      });
      await this.teamMembersCol.doc(this.uid).set({
        displayName: profile.displayName ? profile.displayName : null,
        email: profile.email ? profile.email : null,
        role: profile.role ? profile.role : null,
        url: profile.url ? profile.url : null,
        url_150: profile.url_150 ? profile.url_150 : null,
        uid: this.uid,
        status: "Admin"
      });
      await emails.forEach((email: string) => {
        if (email !== this.email) {
          this.pendingMembersCol.add({
            email: email
          })
        }
      });
      await this.groupDoc.set({
        name: "Everyone",
        createdBy: this.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      await this.groupMembersCol.doc(this.uid).set({
        uid: this.uid,
        status: "Admin"
      });
      await this.userTeamDoc.set({
        id: newTeamId
      });
      await this.userDoc.update({
        lastTeam: newTeamId
      });
      return;
    } catch (err) {
      console.log(err);
    }
  }

  async updateTeamInfo(team: Team) {
    console.log(team);
    return this.db.doc(`teams/${team.id}`).set(team, { merge: true })
  }

}
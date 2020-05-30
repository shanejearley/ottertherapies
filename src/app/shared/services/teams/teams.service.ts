import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { firestore } from 'firebase/app';

import { Store } from 'src/store';

import { Observable } from 'rxjs';
import {
  tap,
  filter,
  map,
  switchMap,
  find,
  shareReplay
} from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';
import { GroupsService } from '../groups/groups.service';
import { MembersService } from '../members/members.service';
import { NotesService } from '../notes/notes.service';

export interface Team {
  id: string,
  name: string,
  publicId: string,
  child: string,
  bio: string,
  url: string,
  url_150: string,
  createdBy: string,
  unread: Unread[],
  unreadMessages: number,
  unreadFiles: number,
  unreadNotes: number
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
  private unreadsCol: AngularFirestoreCollection<Unread>;
  private teamDoc: AngularFirestoreDocument<Team>;
  private unreadDoc: AngularFirestoreDocument<Unread>;
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

  constructor(
    private store: Store,
    private db: AngularFirestore,
    private authService: AuthService,
    private groupsService: GroupsService,
    private membersService: MembersService,
    private notesService: NotesService
  ) { }

  teamsObservable(userId: string) {
    this.teamsCol = this.db.collection<Team>(`users/${userId}/teams`);
    this.teams$ = this.teamsCol.valueChanges()
      .pipe(
        tap(next => {
          console.log("next");
          next.forEach(team => {
            this.getInfo(team);
            this.getUnread(team);
            console.log('team with unread ', team)
          })
          this.store.set('teams', next)
        }),
        shareReplay(1)
      );
    return this.teams$;
  }

  get uid() {
    return this.authService.user.uid;
  }

  get email() {
    return this.authService.user.email;
  }

  async getInfo(team: Team) {
    this.teamDoc = this.db.doc<Team>(`teams/${team.id}`);
    this.team$ = this.teamDoc.valueChanges()
      .pipe(
        tap(next => {
          console.log('TEAM INFO UPDATE');
          team.name = next.name
          team.publicId = next.publicId
          team.child = next.child
          team.bio = next.bio
          team.url = next.url,
          team.url_150 = next.url_150,
          team.createdBy = next.createdBy
        }),
        shareReplay(1)
      )
    this.team$.subscribe();
  }

  getUnread(team) {
    team.unread = [];
    this.unreadsCol = this.db.collection<Unread>(`users/${this.uid}/teams/${team.id}/unread`);
    this.unreads$ = this.unreadsCol.valueChanges({ idField: 'id' })
      .pipe(
        tap(next => {
          next.forEach(unread => {
            this.unreadDoc = this.db.doc<Unread>(`users/${this.uid}/teams/${team.id}/unread/${unread.id}`);
            this.unread$ = this.unreadDoc.valueChanges()
              .pipe(tap(next => {
                let unreadObj = {
                  id: unread.id,
                  unreadMessages: next.unreadMessages ? next.unreadMessages : 0,
                  unreadFiles: next.unreadFiles ? next.unreadFiles : 0,
                  unreadNotes: next.unreadNotes ? next.unreadNotes : 0
                }
                let memberUid: string;
                if (unreadObj.id.length == 56) {
                  memberUid = unreadObj.id.substr(0, 28) !== this.uid ? unreadObj.id.substr(0, 28) : unreadObj.id.substr(28, 28);
                }
                this.groupsService.getGroup(unread.id).subscribe(g => {
                  if (g) {
                    g.unread = unreadObj;
                  }
                })
                this.membersService.getMember(memberUid).subscribe(m => {
                  if (m) {
                    m.unread = unreadObj;
                  }
                })
                this.notesService.getNote(unread.id).subscribe(n => {
                  if (n) {
                    n.unread = unreadObj;
                  }
                })
                if (team.unread.filter(item => item.id == unreadObj.id)[0]) {
                  let itemIndex = team.unread.findIndex(item => item.id == unreadObj.id);
                  team.unread[itemIndex] = unreadObj;
                } else {
                  team.unread.push(unreadObj);
                }
                team.unreadMessages = 0;
                team.unreadFiles = 0;
                team.unreadNotes = 0;
                team.unread.forEach(unreadAdd => {
                  team.unreadMessages += unreadAdd.unreadMessages;
                  team.unreadFiles += unreadAdd.unreadFiles;
                  team.unreadNotes += unreadAdd.unreadNotes;
                })
              }))
            this.unread$.subscribe();
          })
        }),
        shareReplay(1)
      )
    this.unreads$.subscribe();
  }

  getTeam(id: string) {
    return this.store.select<Team[]>('teams')
      .pipe(
        filter(Boolean),
        map((teams: Team[]) => teams.find((team: Team) => team.id === id)));
  }

  async addTeam(newTeamId, childName, emails) {
    const newGroupId = this.db.createId();
    this.teamDoc = this.db.doc<Team>(`teams/${newTeamId}`);
    this.teamMembersCol = this.db.collection(`teams/${newTeamId}/members`);
    this.pendingMembersCol = this.db.collection(`teams/${newTeamId}/pendingMembers`)
    this.groupDoc = this.db.doc(`teams/${newTeamId}/groups/${newGroupId}`);
    this.groupMembersCol = this.db.collection(`teams/${newTeamId}/groups/${newGroupId}/members`);
    this.userTeamDoc = this.db.doc(`users/${this.uid}/teams/${newTeamId}`);
    this.userDoc = this.db.doc(`users/${this.uid}`);
    try {
      await this.teamDoc.set({
        id: null,
        name: childName + "'s Care Team",
        publicId: childName + '-' + newTeamId.slice(-4),
        child: childName,
        bio: null,
        url: null,
        url_150: null,
        createdBy: this.uid,
        unread: null,
        unreadMessages: null,
        unreadFiles: null,
        unreadNotes: null
      });
      await this.teamMembersCol.doc(this.uid).set({
        uid: this.uid,
        email: this.email,
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
        timestamp: firestore.FieldValue.serverTimestamp()
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
    this.teamDoc = this.db.doc<Team>(`teams/${team.id}`);
    return this.teamDoc.update(team);
  }

}
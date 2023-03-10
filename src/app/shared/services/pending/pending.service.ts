import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import firebase from 'firebase/app';

import { Store } from 'src/store';

import { Observable } from 'rxjs';
import {
  tap,
  filter,
  map,
  switchMap,
  find,
  shareReplay,
  take
} from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from 'src/auth/shared/services/profile/profile.service';

export interface Pending {
  id: string,
  name: string,
  publicId: string,
  child: string,
  bio: string,
  notes: string,
  url: string,
  url_150: string,
  createdBy: string
}

@Injectable()
export class PendingService {
  private teamsCol: AngularFirestoreCollection<Pending>;
  private teamDoc: AngularFirestoreDocument<Pending>;
  private pendingCol: AngularFirestoreCollection<Pending>;
  private userTeamDoc: AngularFirestoreDocument;
  private userDoc: AngularFirestoreDocument;
  private teamMembersCol: AngularFirestoreCollection;
  pending$: Observable<Pending[]>;
  team$: Observable<Pending>;

  uid: string;

  constructor(
    private store: Store,
    private db: AngularFirestore,
    private authService: AuthService
  ) { }

  pendingObservable(userId: string) {
    this.teamsCol = this.db.collection<Pending>(`users/${userId}/pendingTeams`);
    this.pending$ = this.teamsCol.valueChanges()
      .pipe(
        tap(next => {
          console.log("next");
          next.forEach(team => {
            this.getInfo(team);
          })
          this.store.set('pending', next)
        }),
        shareReplay(1)
      );
    return this.pending$;
  }

  async getInfo(team: Pending) {
    this.teamDoc = this.db.doc<Pending>(`teams/${team.id}`);
    this.team$ = this.teamDoc.valueChanges()
      .pipe(
        tap(next => {
          team.name = next.name
          team.publicId = next.publicId
          team.child = next.child
          team.bio = next.bio
          team.notes = next.notes
          team.url = next.url,
          team.url_150 = next.url_150,
          team.createdBy = next.createdBy
        }),
        shareReplay(1)
      )
    this.team$.subscribe();
  }

  getTeam(id: string) {
    //if (!id) return Observable.of({});
    return this.store.select<Pending[]>('teams')
      .pipe(
        filter(Boolean),
        map((teams: Pending[]) => teams.find((team: Pending) => team.id === id)));
  }

  async joinTeam(team) {
    this.uid = (await this.authService.user).uid;
    this.teamDoc = this.db.doc<Pending>(`teams/${team.id}`);
    this.pendingCol = this.db.collection<Pending>(`users/${this.uid}/pendingTeams`)
    this.teamMembersCol = this.db.collection(`teams/${team.id}/members`);
    this.userTeamDoc = this.db.doc(`users/${this.uid}/teams/${team.id}`);
    this.userDoc = this.db.doc(`users/${this.uid}`);
    try {
      const profile$ = this.store.select('profile');
      const profile = await profile$.pipe(filter(Boolean), take(1), map((profile: Profile) => profile)).toPromise();
      await this.teamMembersCol.doc(this.uid).set({
        displayName: profile.displayName ? profile.displayName : null,
        email: profile.email ? profile.email : null,
        role: profile.role ? profile.role : null,
        url: profile.url ? profile.url : null,
        url_150: profile.url_150 ? profile.url_150 : null,
        uid: this.uid,
        status: "Member"
      });
      await this.userTeamDoc.set({
        id: team.id
      });
      await this.userDoc.update({
        lastTeam: team.id
      });
      await this.pendingCol.doc(team.id).delete();
      return;
    } catch (err) {
      console.log(err);
    }
  }

}
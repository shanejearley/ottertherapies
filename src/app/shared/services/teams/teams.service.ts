import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Store } from 'src/store';

import { Observable } from 'rxjs';
import {
    tap,
    filter,
    map,
    switchMap,
    find } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service';

export interface Team {
  id: string,
  name: string,
  publicId: string,
  child: string,
  bio: string,
  notes: string,
  url: string,
  createdBy: string,
  unread: string[],
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
    unreads$: Observable<Unread[]>;
    unread$: Observable<Unread>;
    teams$: Observable<Team[]>;
    team$: Observable<Team>;

  constructor(
    private store: Store,
    private db: AngularFirestore,
    private authService: AuthService
  ) {}

  teamsObservable(userId: string) {
    this.teamsCol = this.db.collection<Team>(`users/${userId}/teams`);
    this.teams$ = this.teamsCol.valueChanges()
        .pipe(tap(next => {
            console.log("next");
            next.forEach(team => {
                this.getInfo(team);
                this.getUnread(team);
            })
            this.store.set('teams', next)
        }));
    return this.teams$;
  }

  get uid() {
    return this.authService.user.uid;
  }

  async getInfo(team: Team) {
    this.teamDoc = this.db.doc<Team>(`teams/${team.id}`);
    this.team$ = this.teamDoc.valueChanges()
    .pipe(tap(next => {
        team.name = next.name,
        team.publicId = next.publicId,
        team.child = next.child,
        team.bio = next.bio,
        team.notes = next.notes,
        team.url = next.url,
        team.createdBy = next.createdBy
    }))
    this.team$.subscribe();
  }

  getUnread(team) {
    team.unread = [];
    team.unreadMessages, team.unreadFiles, team.unreadNotes = 0;
    this.unreadsCol = this.db.collection<Unread>(`users/${this.uid}/teams/${team.id}/unread`);
    this.unreads$ = this.unreadsCol.valueChanges({idField: 'id'})
    .pipe(tap(next => {
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
                if (team.unread.filter(item => item.id == unreadObj.id)[0]) {
                    let itemIndex = team.unread.findIndex(item => item.id == unreadObj.id);
                    team.unread[itemIndex] = unreadObj;
                } else {
                    team.unread.push(unreadObj);
                }
                if (team.unread.length > 1) {
                    team.unread.reduce(function(previousValue, currentValue) {
                        if (previousValue && currentValue) {
                            team.unreadMessages = previousValue.unreadMessages + currentValue.unreadMessages,
                            team.unreadFiles = previousValue.unreadFiles + currentValue.unreadFiles,
                            team.unreadNotes = previousValue.unreadNotes + currentValue.unreadNotes
                        }
                    });
                } else {
                    team.unreadMessages = unreadObj.unreadMessages;
                    team.unreadFiles = unreadObj.unreadFiles;
                    team.unreadNotes = unreadObj.unreadNotes;
                }
            }))
            this.unread$.subscribe();
        })
    }))
    this.unreads$.subscribe();
  }

  getTeam(id: string) {
    //if (!id) return Observable.of({});
    return this.store.select<Team[]>('teams')
      .pipe(
        filter(Boolean),
        map((teams: Team[]) => teams.find((team: Team) => team.id === id)));
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
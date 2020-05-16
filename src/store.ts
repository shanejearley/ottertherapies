import { Observable } from 'rxjs';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { pluck } from 'rxjs/operators';

import { User } from './auth/shared/services/auth/auth.service';
import { Profile } from './auth/shared/services/profile/profile.service';
import { Team } from './app/shared/services/teams/teams.service';
import { Group } from './app/shared/services/groups/groups.service';
import { Member } from './app/shared/services/members/members.service';
import { Note } from './app/shared/services/notes/notes.service';
import { Event } from './app/shared/services/events/events.service';
import { Pending } from './app/shared/services/pending/pending.service';
import { Injectable } from "@angular/core";
import { Resource } from './app/shared/services/resources/resources.service';

export interface State {
  user: User,
  profile: Profile,
  teams: Team[],
  pending: Pending[],
  groups: Group[],
  members: Member[],
  notes: Note[],
  events: Event[],
  resources: Resource[],
  badge: number,
  dark: boolean,
  selected: any,
  list: any,
  date: Date,
  [key: string]: any
}

const state: State = {
  user: undefined,
  profile: undefined,
  teams: undefined,
  pending: undefined,
  groups: undefined,
  members: undefined,
  notes: undefined,
  events: undefined,
  resources: undefined,
  badge: undefined,
  dark: undefined,
  selected: undefined,
  list: undefined,
  date: undefined,
};

@Injectable()
export class Store {

  private subject = new BehaviorSubject<State>(state);
  private store = this.subject.asObservable().pipe(distinctUntilChanged());

  get value() {
    return this.subject.value;
  }

  select<T>(name: string): Observable<T> {
    return this.store.pipe(pluck(name));
  }

  set(name: string, state: any) {
    this.subject.next({ ...this.value, [name]: state });
  }

}

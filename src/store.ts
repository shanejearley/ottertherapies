import { Observable } from 'rxjs';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { pluck } from 'rxjs/operators';

import { User } from './auth/shared/services/auth/auth.service';
import { Profile } from './auth/shared/services/profile/profile.service';
import { Team } from './app/shared/services/teams/teams.service';
import { Group } from './app/shared/services/groups/groups.service';
import { Member } from './app/shared/services/members/members.service';

export interface State {
  user: User,
  profile: Profile,
  teams: Team[],
  groups: Group[],
  members: Member[],
  selected: any,
  list: any,
  date: Date,
  [key: string]: any
}

const state: State = {
  user: undefined,
  profile: undefined,
  teams: undefined,
  groups: undefined,
  members: undefined,
  selected: undefined,
  list: undefined,
  date: undefined,
};

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

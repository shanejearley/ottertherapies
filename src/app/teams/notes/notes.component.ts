import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { User } from '../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { NotesService, Note } from '../../shared/services/notes/notes.service';

import { Store } from 'src/store';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
})
export class NotesComponent implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  notes$: Observable<Note[]>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  date: Date;
  time: number;
  newNote: string;
  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private teamsService: TeamsService,
    private notesService: NotesService
  ) { }

  ngOnInit() {
    this.newNote = '';
    this.date = new Date();
    this.time = this.date.getTime();
    this.profile$ = this.store.select<Profile>('profile');
    this.notes$ = this.store.select<Note[]>('notes');
    this.notes$.pipe(tap(notes => {
      notes.forEach(n => {
        if (n.unread && n.unread.unreadNotes) {
          this.notesService.checkLastNote(n.id);
        }
      })
    })).subscribe()
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
  }

  showNote(n) {
    n.show = !n.show;
    // if (n.show) {
    //   console.log('checkin')
    //   this.notesService.checkLastFile(g.id);
    // }
  }

  postComment(n) {
    this.notesService.addComment(n.newComment, n.id);
    n.newComment = '';
  }

  postNote() {
    this.notesService.addNote(this.newNote);
    this.newNote = '';
  }

  flagNote(n: Note) {
    this.notesService.flagNote(n);
  }

  onKeydown(event){
    event.preventDefault();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

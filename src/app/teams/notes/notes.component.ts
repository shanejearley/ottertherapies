import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators'

import { User } from '../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { NotesService, Note } from '../../shared/services/notes/notes.service';

import { Store } from 'src/store';
import { ActionSheetController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
})
export class NotesComponent implements OnInit {
  ios: boolean;
  android: boolean;
  desktop: boolean;
  sortType: string;
  sortReverse: boolean = true;
  notes: Note[];
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
  notesSub: Subscription;
  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private teamsService: TeamsService,
    private notesService: NotesService,
    private actionSheetController: ActionSheetController,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    this.newNote = '';
    this.date = new Date();
    this.time = this.date.getTime();
    this.profile$ = this.store.select<Profile>('profile');
    this.notes$ = this.store.select<Note[]>('notes');
    this.notesSub = this.notes$.pipe(tap(notes => {
      if (notes) {
        this.notes = notes;
        this.notes.sort(this.dynamicSort('timestamp'));
        notes.forEach((n: Note) => {
          n.newComment = '';
          if (n.unread && n.unread.unreadNotes > 0) {
            this.notesService.checkLastNote(n.id);
          }
        })
      }
    })).subscribe()
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
  }

  async removeNote(noteId: string) {
    return this.presentActionSheet("note", noteId, null);
  }

  async removeComment(noteId: string, commentId: string) {
    return this.presentActionSheet("comment", noteId, commentId);
  }

  async presentActionSheet(type: string, noteId: string, commentId: string) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Warning: Permanent Action',
      buttons: [{
        text: 'Delete',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          console.log('Delete clicked');
          if (type === 'note') {
            return this.notesService.removeNote(noteId);
            //
          } else if (type === 'comment') {
            return this.notesService.removeComment(noteId, commentId);
            //
          }
        }
      }, {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();
  }

  onSort(ev: { detail: { value: any; }; }) {
    this.sortNotes(ev.detail.value);
  }

  dynamicSort(property) {
    let sortOrder = -1;
    // if (this.sortReverse) {
    //   sortOrder = 1;
    // }
    return function (a, b) {
      let result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
    }
  }

  sortNotes(property) {
    this.sortType = property;
    //this.sortReverse = !this.sortReverse;
    this.notes$.pipe(map(notes => {
      if (notes) {
        this.notes.sort(this.dynamicSort(property));
      }
    })).subscribe()
  }

  showNote(n) {
    n.show = !n.show;
    // if (n.show) {
    //   console.log('checkin')
    //   this.notesService.checkLastFile(g.id);
    // }
  }

  checkPostNote() {
    if (this.desktop) {
      this.postNote();
    }
  }

  checkPostComment(n) {
    if (this.desktop) {
      this.postComment(n);
    }
  }

  onKeydown(event) {
    if (this.desktop) {
      event.preventDefault();
    }
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

  ngOnDestroy() {
    // console.log('destroying');
    // if (this.notesSub && !this.notesSub.closed) { this.notesSub.unsubscribe }
    // if (this.notes) { this.notes = null }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params, RoutesRecognized } from '@angular/router';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { Observable, empty } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';
import { of } from 'rxjs'

import { AuthService, User } from '../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from './shared/services/teams/teams.service';
import { GroupsService, Group } from './shared/services/groups/groups.service';
import { NotesService, Note } from './shared/services/notes/notes.service';
import { MembersService, Member } from './shared/services/members/members.service';
import { PendingService } from './shared/services/pending/pending.service';
import { EventsService } from './shared/services/events/events.service';
import { Store } from 'src/store';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  authSub: Subscription;
  profileSub: Subscription;
  teamsSub: Subscription;
  groupsSub: Subscription;
  membersSub: Subscription;
  notesSub: Subscription;
  eventsSub: Subscription;
  pendingSub: Subscription;
  teamId: string;
  lastId: string;
  page: string;
  loggedIn: boolean;
  public selectedIndex = 0;
  public appPages = [
    {
      title: 'Dashboard',
      icon: 'grid'
    },
    {
      title: 'Events',
      icon: 'calendar'
    },
    {
      title: 'Messages',
      icon: 'chatbubbles'
    },
    {
      title: 'Files',
      icon: 'document'
    },
    {
      title: 'Notes',
      icon: 'newspaper'
    },
    {
      title: 'Team',
      icon: 'people'
    },
    {
      title: 'Child',
      icon: 'happy'
    },
    {
      title: 'Resources',
      icon: 'help-buoy'
    },
    {
      title: 'Profile',
      icon: 'person'
    }
  ];

  dark;

  constructor(
    private store: Store,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private router: Router,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private groupsService: GroupsService,
    private membersService: MembersService,
    private notesService: NotesService,
    private pendingService: PendingService,
    private eventsService: EventsService
  ) {
    this.initializeApp();

    if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {console.log('🎉 Dark mode is supported');}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    toggleDarkTheme(prefersDark.matches);

    // Listen for changes to the prefers-color-scheme media query
    prefersDark.addListener((mediaQuery) => toggleDarkTheme(mediaQuery.matches));

    // Add or remove the "dark" class based on if the media query matches
    function toggleDarkTheme(shouldAdd) {
      document.body.classList.toggle('dark', shouldAdd);
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  toggleDarkTheme(shouldAdd) {
    document.body.classList.toggle('dark', shouldAdd);
  }

  change() {
    console.log('called');
    this.dark = !this.dark;
    this.toggleDarkTheme(this.dark);
  }

  ngOnInit() {
    this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.user$ = this.store.select<User>('user');
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    this.authService.userAuth.onAuthStateChanged(user => {
      if (user) {
        this.authSub = this.authService.auth$.subscribe();
        this.profileSub = this.profileService.profileObservable(user.uid).subscribe();
        this.teamsSub = this.teamsService.teamsObservable(user.uid).subscribe();
        this.pendingSub = this.pendingService.pendingObservable(user.uid).subscribe();
      }
    })
    const path = window.location.pathname.split('Teams/:id/')[1];
    if (path !== undefined) {
      this.selectedIndex = this.appPages.findIndex(page => page.title.toLowerCase() === path.toLowerCase());
    }
    this.router.events.subscribe(val => {
      if (val instanceof RoutesRecognized) {
        this.teamId = val.state.root.firstChild.params['id'];
        if (this.teamId !== this.lastId) {
          this.store.set('notes', null);
          this.store.set('events', null);
          this.team$ = this.teamsService.getTeam(this.teamId);
          this.authService.userAuth.onAuthStateChanged(user => {
            this.membersSub = this.membersService.membersObservable(user.uid, this.teamId).subscribe(() => {
              this.groupsSub = this.groupsService.groupsObservable(user.uid, this.teamId).subscribe();
              this.eventsSub = this.eventsService.eventsObservable(user.uid, this.teamId, new Date()).subscribe();
              this.notesSub = this.notesService.notesObservable(user.uid, this.teamId).subscribe();
            });
          })
          this.lastId = this.teamId;
        }
        if (val.state.root.firstChild.params['id']) {
          this.page = val.state.root.firstChild.url[2].path;
        }
        if (!val.state.root.firstChild.params['id']) {
          this.page = null;
        }
      }
    });
  }

  async onLogout() {
    await this.router.navigate(["/auth/login"])
    await this.store.set('user', null);
    await this.store.set('profile', null);
    await this.store.set('teams', null);
    await this.store.set('groups', null);
    await this.store.set('members', null);
    await this.store.set('notes', null);
    await this.store.set('events', null);
    await this.authSub.unsubscribe();
    await this.profileSub.unsubscribe();
    await this.teamsSub.unsubscribe();
    await this.teamsSub.unsubscribe();
    await this.pendingSub.unsubscribe();
    if (this.groupsSub) {
      await this.groupsSub.unsubscribe();
      await this.membersSub.unsubscribe();
      await this.notesSub.unsubscribe();
      await this.eventsSub.unsubscribe(); 
    }
    return this.authService.logoutUser();
  }

  ngOnDestroy() {
    this.authSub.unsubscribe();
    this.profileSub.unsubscribe();
    this.teamsSub.unsubscribe();
    this.pendingSub.unsubscribe();
    if (this.groupsSub) {
      this.groupsSub.unsubscribe();
      this.membersSub.unsubscribe();
      this.notesSub.unsubscribe();
      this.eventsSub.unsubscribe();
    }
  }
}

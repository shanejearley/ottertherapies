import { Component, OnInit, AfterContentChecked } from '@angular/core';
import { Router, RoutesRecognized } from '@angular/router';

import { Platform, Config } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Badge } from '@ionic-native/badge/ngx';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { tap, map, reduce } from 'rxjs/operators';

import { AuthService, User } from '../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from './shared/services/teams/teams.service';
import { GroupsService, Group } from './shared/services/groups/groups.service';
import { NotesService, Note } from './shared/services/notes/notes.service';
import { MembersService, Member } from './shared/services/members/members.service';
import { PendingService } from './shared/services/pending/pending.service';
import { EventsService } from './shared/services/events/events.service';
import { Store } from 'src/store';
import { ResourcesService } from './shared/services/resources/resources.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit, AfterContentChecked {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  teams$: Observable<Team[]>;
  badge$: Observable<number>;
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
  resourcesSub: Subscription;
  badgeSub: Subscription;
  teamId: string;
  lastId: string;
  page: string;
  loggedIn: boolean;
  menu: boolean;
  ios: boolean;
  total: number;
  teams: Team[];
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
    private eventsService: EventsService,
    private resourcesService: ResourcesService,
    private config: Config,
    private badge: Badge
  ) {
    this.initializeApp();

    if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') { console.log('🎉 Dark mode is supported'); }
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
    this.ios = this.config.get('mode') === 'ios';
    this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.user$ = this.store.select<User>('user');
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    this.subscribeUser();
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
          this.subscribeUserTeam();
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

  ngAfterContentChecked() {
    this.badge$ = this.teams$.pipe(
      map(teams => {
        this.total = this.total || null;
        this.teams = this.teams || null;
        if (!teams) {
          return;
        }
        return teams.reduce((total: number, team: Team) => total + team.unreadMessages + team.unreadFiles + team.unreadNotes, 0);
      })
    )
    this.badge$.pipe(map(badge => {
      if (badge && this.ios) {
        this.badge.set(badge);
      }
    })).subscribe();
  }

  async subscribeUserTeam() {
    this.authService.authState
      .pipe(map((user) => {
        if (this.teamId && this.teamId !== 'undefined' && this.teamId !== ':id' && this.teamId !== null) {

          this.membersSub = this.membersService.membersObservable(user.uid, this.teamId).subscribe(() => {
            this.groupsSub = this.groupsService.groupsObservable(user.uid, this.teamId).subscribe();
            this.eventsSub = this.eventsService.eventsObservable(user.uid, this.teamId, new Date()).subscribe();
            this.notesSub = this.notesService.notesObservable(user.uid, this.teamId).subscribe();
            this.resourcesSub = this.resourcesService.resourcesObservable(user.uid, this.teamId).subscribe();
          });

        } else {

          if (this.membersSub) { this.membersSub.unsubscribe() };
          if (this.groupsSub) { this.groupsSub.unsubscribe() };
          if (this.eventsSub) { this.eventsSub.unsubscribe() };
          if (this.notesSub) { this.notesSub.unsubscribe() };
          if (this.resourcesSub) { this.resourcesSub.unsubscribe() };
        }
      }
      )).subscribe()
  }

  async subscribeUser() {
    this.authSub = this.authService.auth$.subscribe();
    this.user$
      .pipe(
        map((user) => {
          if (user && user.authenticated && user.emailVerified && user.mfa && !this.menu) {
            console.log(user, user.authenticated, user.emailVerified, user.mfa, !this.menu)
            console.log('App has not subscribed to profile yet, so I will subscribe - app')
            this.menu = true;
            this.profileSub = this.profileService.profileObservable(user.uid).subscribe();
            this.teamsSub = this.teamsService.teamsObservable(user.uid).subscribe();
            this.pendingSub = this.pendingService.pendingObservable(user.uid).subscribe();
          } else if (user && !user.authenticated) {
            console.log('signed out')
          }
          return !!user;
        })
      ).subscribe();
  }

  async onLogout() {
    this.menu = false;
    //this.authSub.unsubscribe();
    if (this.profileSub) {
      this.profileSub.unsubscribe();
      this.teamsSub.unsubscribe();
      this.pendingSub.unsubscribe();
    }
    if (this.groupsSub) {
      this.groupsSub.unsubscribe();
      this.membersSub.unsubscribe();
      this.notesSub.unsubscribe();
      this.eventsSub.unsubscribe();
      this.resourcesSub.unsubscribe();
    }
    await this.authService.logoutUser();
  }

  ngOnDestroy() {
    //this.authSub.unsubscribe();
    this.profileSub.unsubscribe();
    this.teamsSub.unsubscribe();
    this.pendingSub.unsubscribe();
    if (this.groupsSub) {
      this.groupsSub.unsubscribe();
      this.membersSub.unsubscribe();
      this.notesSub.unsubscribe();
      this.eventsSub.unsubscribe();
      this.resourcesSub.unsubscribe();
    }
  }
}

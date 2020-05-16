import { Component, OnInit, AfterContentChecked, AfterViewInit, AfterContentInit, HostListener, EventEmitter } from '@angular/core';
import { Router, RoutesRecognized, GuardsCheckEnd } from '@angular/router';

import { Platform, Config, PopoverController, ModalController, IonRouterOutlet, ToastController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Badge } from '@ionic-native/badge/ngx';

import { Plugins } from '@capacitor/core';
const { Browser } = Plugins;

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { tap, map, reduce, takeUntil } from 'rxjs/operators';

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
import { BadgeService } from './shared/services/badge/badge.service';
import { EditProfileComponent } from './teams/profile/edit-profile/edit-profile.component';
import { DarkService } from './shared/services/dark/dark.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

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

  root: string;
  page: string;
  child: string;
  prevPage: string;

  loggedIn: boolean;
  menu: boolean;
  init: boolean;
  desktop: boolean;
  ios: boolean;
  android: boolean;
  teams: Team[];

  public teamPages = [
    {
      title: 'Team',
      icon: 'people'
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
      icon: 'document-text'
    },
    {
      title: 'Notes',
      icon: 'newspaper'
    }
  ];

  dark: boolean;
  dark$: Observable<boolean>;

  private readonly onDestroy = new Subject<void>();

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
    private badgeService: BadgeService,
    private badge: Badge,
    private darkService: DarkService
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

  // ngAfterContentInit() {
  //   //this.badgeSub = this.badgeService.badge$.subscribe();
  // }

  async showPrivacy() {
    await Browser.open({ url: 'https://ottertherapies.com/privacy-and-terms' });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
      if (this.ios || this.android) {
        this.badge.set(0);
      }
    });
  }

  toggleDarkTheme(shouldAdd) {
    document.body.classList.toggle('dark', shouldAdd);
  }

  change() {
    if (!this.ios && !this.android) {
      this.darkService.toggle(!this.dark);
    }
  }

  get uid() {
    return this.authService.user.uid;
  }

  get currentProfile() {
    return this.profileService.currentProfile;
  }

  // ngAfterViewInit() {
  //   this.badge$.pipe(map(badge => {
  //     if (badge) {
  //       console.log('BADGER BADGE', badge);
  //       this.profileService.updateBadge(this.uid, badge);
  //       if (this.ios || this.android) {
  //       }
  //     }
  //   })).subscribe();
  // }

  ngOnInit() {
    this.dark$ = this.store.select('dark');

    this.darkService.dark$.pipe(
      takeUntil(this.onDestroy),
      tap(dark => {
        this.toggleDarkTheme(dark);
        this.dark = dark;
      })
    ).subscribe()
    
    //const path = window.location.pathname.split('Teams/:id/')[1];
    this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.store.set('dark', this.dark);
    this.user$ = this.store.select<User>('user');
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    // this.teams$.subscribe(ts => {
    //   if (ts) {
    //     let unreadMessages = 0;
    //     ts.forEach(t => {
    //       unreadMessages += t.unreadMessages;
    //     })
    //     console.log(unreadMessages);
    //   }
    // })
    //this.badge$ = this.store.select<number>('badge');
    this.subscribeUser();
    this.router.events.subscribe(val => {
      if (val instanceof GuardsCheckEnd) {
        this.teamId = val.state.root.firstChild.params['id'];
        if (this.teamId !== this.lastId) {
          this.team$ = this.teamsService.getTeam(this.teamId);
          this.subscribeUserTeam();
          this.lastId = this.teamId;
        }
        if (val.state.root.firstChild.url[0]) {
          this.root = val.state.root.firstChild.url[0].path;
          if (this.root === 'auth') {
            this.menu = false;
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
          }
        }
        if (!val.state.root.firstChild.url[0]) {
          this.root = null;
        }
        if (val.state.root.firstChild.params['id'] && val.shouldActivate) {
          this.page = val.state.root.firstChild.url[2].path;
          if (val.state.root.firstChild.url[3]) {
            this.child = val.state.root.firstChild.url[3].path;
          }
          if (!val.state.root.firstChild.url[3]) {
            this.child = null;
          }
        }
        if (!val.state.root.firstChild.params['id'] && val.shouldActivate) {
          this.page = null;
          this.child = null;
        }
        console.log('VAL STATE ROOT FIRST CHILD', val.state.root.firstChild)
      }
    });
  }

  // ngAfterContentChecked() {
  //   if (!this.teams) {
  //     return;
  //   }
  //   this.badge$ = this.teams.reduce((total: number, team: Team) => total + team.unreadMessages + team.unreadFiles + team.unreadNotes, 0);
  // }

  async subscribeUserTeam() {
    this.authService.authState
      .pipe(map((user) => {
        if (this.teamId && this.teamId !== 'undefined' && this.teamId !== ':id' && this.teamId !== null) {
          if (!this.membersSub || this.membersSub.closed) {
            this.membersSub = this.membersService.membersObservable(user.uid, this.teamId).subscribe(() => {
              this.groupsSub = this.groupsService.groupsObservable(user.uid, this.teamId).subscribe();
              this.eventsSub = this.eventsService.eventsObservable(user.uid, this.teamId, new Date()).subscribe();
              this.notesSub = this.notesService.notesObservable(user.uid, this.teamId).subscribe();
              this.resourcesSub = this.resourcesService.resourcesObservable(user.uid, this.teamId).subscribe();
            });
          }

        } else {
          this.unsubscribeUserTeam();
        }
      }
      )).subscribe()
  }

  async unsubscribeUserTeam() {
    if (this.membersSub) { this.membersSub.unsubscribe() };
    if (this.groupsSub) { this.groupsSub.unsubscribe() };
    if (this.eventsSub) { this.eventsSub.unsubscribe() };
    if (this.notesSub) { this.notesSub.unsubscribe() };
    if (this.resourcesSub) { this.resourcesSub.unsubscribe() };
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
            //this.badgeSub = this.badgeService.badge$.subscribe();
          } else if (user && !user.authenticated) {
            console.log('signed out')
          }
          return !!user;
        })
      ).subscribe();
  }

  async onLogout() {
    await this.authService.logoutUser();
  }

  ngOnDestroy() {
    this.onDestroy.next();
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

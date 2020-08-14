import { Component, OnInit, HostListener, NgZone, ViewChild, ElementRef } from '@angular/core';
import { Router, GuardsCheckEnd, NavigationEnd, RoutesRecognized } from '@angular/router';

import { Platform, ToastController, IonToggle } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { Plugins, registerWebPlugin } from '@capacitor/core';
const { App, Browser } = Plugins;
import { FileSharer } from '@byteowls/capacitor-filesharer';

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { tap, map, takeUntil, take, filter } from 'rxjs/operators';

import { AuthService, User } from '../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from './shared/services/teams/teams.service';
import { GroupsService, Group } from './shared/services/groups/groups.service';
import { NotesService } from './shared/services/notes/notes.service';
import { MembersService } from './shared/services/members/members.service';
import { PendingService } from './shared/services/pending/pending.service';
import { EventsService } from './shared/services/events/events.service';
import { Store } from 'src/store';
import { ResourcesService } from './shared/services/resources/resources.service';
import { DarkService } from './shared/services/dark/dark.service';
import { SwUpdate } from '@angular/service-worker';
import { PresenceService } from './shared/services/presence/presence.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('darkToggle', { read: ElementRef, static: false }) darkToggle: ElementRef;

  @HostListener('dragover', ['$event'])
  onDragOver($event) {
    $event.preventDefault();
  }
  @HostListener('dragleave', ['$event'])
  onDragLeave($event) {
    $event.preventDefault();
  }
  @HostListener('drop', ['$event'])
  onDrop($event) {
    $event.preventDefault();
  }

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
  recurringEventsSub: Subscription;
  pendingSub: Subscription;
  resourcesSub: Subscription;

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
  capacitor: boolean;
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
      icon: 'chatbubble-ellipses'
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
    private toastController: ToastController,
    private swUpdate: SwUpdate,
    private router: Router,
    private zone: NgZone,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private groupsService: GroupsService,
    private membersService: MembersService,
    private notesService: NotesService,
    private pendingService: PendingService,
    private eventsService: EventsService,
    private resourcesService: ResourcesService,
    private presenceService: PresenceService,
    private darkService: DarkService,
  ) { this.initializeApp() }

  async showPrivacy() {
    await Browser.open({ url: 'https://ottertherapies.com/privacy-and-terms' });
  }

  async showGuide() {
    await Browser.open({ url: 'https://ottertherapies.com/guide' });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios');
      this.android = this.platform.is('android');
      this.capacitor = this.platform.is('capacitor');
    });
    App.addListener('appUrlOpen', (data: any) => {
      this.zone.run(() => {
        // Example url: https://beerswift.app/tabs/tab2
        // slug = /tabs/tab2
        const slugOne = data.url.split(".app").pop();
        const slugTwo = slugOne.split('https://ottertherapies.firebaseapp.com').pop();
        const googleCalendarRedirect = slugTwo.includes('https://www.googleapis.com/auth/calendar');
        if (slugTwo) {
          if (!this.ios && !this.android && !this.capacitor || !googleCalendarRedirect) {
            this.router.navigateByUrl(slugTwo);
          } else if (googleCalendarRedirect) {
            // Rely on profile component
          }
        } else if (slugOne) {
          this.router.navigateByUrl(slugOne);
        }
        // If no match, do nothing - let regular routing 
        // logic take over
      });
    });
    if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') { console.log('🎉 Dark mode is supported'); }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Listen for changes to the prefers-color-scheme media query
    prefersDark.addListener(async (mediaQuery) => {

      console.log('toggle auto');
      this.dark = mediaQuery.matches;

      setTimeout(() => {
        this.darkToggle.nativeElement.click();
      }, 250)

    });
    
  }

  watchDark() {
    this.darkService.dark$.pipe(takeUntil(this.onDestroy), map(dark => this.dark = dark)).subscribe();
  }

  clickToggle() {
    this.darkToggler();
  }

  async darkToggler() {
    return this.darkService.toggle(this.dark);
  }

  get uid() {
    return this.authService.user.uid;
  }

  get currentProfile() {
    return this.profileService.currentProfile;
  }

  ionViewDidEnter() {

  }

  ngOnInit() {
    registerWebPlugin(FileSharer);
    this.swUpdate.available.subscribe(async res => {
      const updateToast = await this.toastController.create({
        message: 'Update available!',
        position: 'bottom',
        buttons: [
          {
            role: 'cancel',
            text: 'Reload'
          }
        ]
      });

      await updateToast.present();

      updateToast
        .onDidDismiss()
        .then(() => this.swUpdate.activateUpdate())
        .then(() => window.location.reload());
    });

    this.dark$ = this.store.select('dark');
    this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.watchDark();
    console.log('watch dark in init', this.dark);
    this.darkService.toggle(this.dark);

    this.user$ = this.store.select<User>('user');
    this.profile$ = this.store.select<Profile>('profile');
    this.teams$ = this.store.select<Team[]>('teams');
    this.subscribeUser();
    this.router.events.subscribe(val => {
      if (val instanceof RoutesRecognized) {
        this.teamId = val.state.root.firstChild.params['id'];
        if (this.teamId !== this.lastId) {
          this.team$ = this.teamsService.getTeam(this.teamId);
          this.subscribeUserTeam();
          this.lastId = this.teamId;
        }
      }
      if (val instanceof GuardsCheckEnd) {
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
              this.recurringEventsSub.unsubscribe();
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
      if (val instanceof NavigationEnd) {
        if (window.location.hostname === 'ottertherapies.firebaseapp.com') {
          console.log(`SWITCHING HOSTNAME AND GOING TO https://ottertherapies.web.app${val.url}`);
          window.location.href = `https://ottertherapies.web.app${val.url}`;
        }
      }
    });
  }

  async subscribeUserTeam() {
    this.authService.authState
      .pipe(map((user) => {
        if (this.teamId && this.teamId !== 'undefined' && this.teamId !== ':id' && this.teamId !== null) {
          this.membersSub = this.membersService.membersObservable(user.uid, this.teamId).subscribe(() => {
            this.groupsSub = this.groupsService.groupsObservable(user.uid, this.teamId).subscribe();
            this.eventsSub = this.eventsService.eventsObservable(user.uid, this.teamId, new Date()).subscribe();
            this.recurringEventsSub = this.eventsService.recurringEventsObservable(user.uid, this.teamId).subscribe();
            this.notesSub = this.notesService.notesObservable(user.uid, this.teamId).subscribe();
            this.resourcesSub = this.resourcesService.resourcesObservable(user.uid, this.teamId).subscribe();
          });

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
    if (this.recurringEventsSub) { this.recurringEventsSub.unsubscribe() };
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
          } else if (user && !user.authenticated) {
            console.log('signed out')
          }
          return !!user;
        })
      ).subscribe();
  }

  async onLogout() {
    await this.presenceService.setPresence('offline');
    return this.authService.logoutUser();
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
      this.recurringEventsSub.unsubscribe();
      this.resourcesSub.unsubscribe();
    }
  }
}

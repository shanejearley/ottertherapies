import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';

import { Store } from 'src/store';
import { ModalController, IonRouterOutlet, ToastController } from '@ionic/angular';
import { ProfilePictureComponent } from '../profile/profile-picture/profile-picture.component';
import { MembersService, Member } from 'src/app/shared/services/members/members.service';
import { ComponentCanDeactivate } from 'src/app/shared/guards/pending-changes.guard';

@Component({
  selector: 'app-child',
  templateUrl: './child.component.html',
  styleUrls: ['./child.component.scss'],
})
export class ChildComponent implements OnInit, ComponentCanDeactivate {
  @HostListener('window:beforeunload')
  canDeactivate(): Observable<boolean> | boolean {
    if (this.team.child !== this.currentTeam.child || this.team.bio !== this.currentTeam.bio) {
      return false;
    } else {
      return true;
    }
  }

  edit: boolean = false;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  member$: Observable<Member>;
  memberStatus: string;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  subscriptions: Subscription[] = [];
  public team;
  public page: string;
  data;
  currentTeam: Team;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private modalController: ModalController,
    private toastController: ToastController,
    private routerOutlet: IonRouterOutlet,
    private membersService: MembersService
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.profile$.pipe(tap(profile => {
      if (profile) {
        this.member$ = this.membersService.getMember(profile.uid);
        this.member$.pipe(tap(m => {
          if (m) {
            this.memberStatus = m.status;
          }
        })).subscribe()
      }
    })).subscribe()
    this.groups$ = this.store.select<Group[]>('groups');
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
    this.team$.pipe(tap(team => {
      if (team) {
        this.team = {
          id: team.id ? team.id : null,
          name: team.name ? team.name : null,
          publicId: team.publicId ? team.publicId : null,
          child: team.child ? team.child : null,
          bio: team.bio ? team.bio : null,
          url: team.url ? team.url : null,
        }
        if (!this.currentTeam) {
          console.log('current team... first', team);
          this.currentTeam = team;
        }
      }
    })).subscribe()
  }

  async updateTeamInfo() {
    if (this.team.child !== this.currentTeam.child || this.team.bio !== this.currentTeam.bio) {
      console.log('updating...');
      if (this.team.child !== this.currentTeam.child) {
        this.team.name = this.team.child + "'s Care Team";
        this.team.publicId = this.team.child + "-" + this.team.id.slice(-4);
      }
      this.currentTeam = null;
      await this.teamsService.updateTeamInfo(this.team);
      await this.presentTeamUpdateToast();
      this.teamsService.getTeam(this.team.id).pipe(tap(team => {
        if (team && !this.currentTeam) {
          console.log('current team... second', team);
          this.currentTeam = team;
        }
      })).subscribe();
      return;
    } else {
      console.log('no update necessary');
    }
  }

  async profilePictureModal() {
    const modal = await this.modalController.create({
      component: ProfilePictureComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      componentProps: {
        'teamId': this.team.id,
      }
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentPictureUpdateToast();
      }
    });
    return await modal.present();
  }

  async presentPictureUpdateToast() {
    const toast = await this.toastController.create({
      message: 'Your child picture was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  async presentTeamUpdateToast() {
    const toast = await this.toastController.create({
      message: 'Your child profile was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

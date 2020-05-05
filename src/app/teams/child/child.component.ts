import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';

import { Store } from 'src/store';
import { ModalController, IonRouterOutlet, ToastController } from '@ionic/angular';
import { ProfilePictureComponent } from '../profile/profile-picture/profile-picture.component';

@Component({
  selector: 'app-child',
  templateUrl: './child.component.html',
  styleUrls: ['./child.component.scss'],
})
export class ChildComponent implements OnInit {
  edit: boolean = false;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  subscriptions: Subscription[] = [];
  public team;
  public childName;
  public page: string;
  data;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private modalController: ModalController,
    private toastController: ToastController,
    private routerOutlet: IonRouterOutlet
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
    this.team$.subscribe(team => {
      this.childName = team.child ? team.child : null
      this.team = {
        id: team.id ? team.id : null,
        name: team.name ? team.name : null,
        publicId: team.publicId ? team.publicId : null,
        child: team.child ? team.child : null,
        bio: team.bio ? team.bio : null,
        url: team.url ? team.url : null,
      }
    })
  }

  updateTeamInfo() {
    this.edit = false;
    if (this.team.child !== this.childName) {
      this.team.name = this.team.child + "'s Care Team";
      this.team.publicId = this.team.child + "-" + this.team.id.slice(-4);
    }
    this.teamsService.updateTeamInfo(this.team);
  }

  async profilePictureModal() {
    const modal = await this.modalController.create({
      component: ProfilePictureComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      componentProps: {
        'type': 'child',
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

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}

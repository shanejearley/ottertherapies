import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil, filter } from 'rxjs/operators'

import { Plugins } from '@capacitor/core';
const { Browser } = Plugins;

import { User } from '../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { Group } from '../../shared/services/groups/groups.service';
import { Member, MembersService } from '../../shared/services/members/members.service';
import { EditTeamComponent } from './edit-team/edit-team.component';

import { Store } from 'src/store';

import { ModalController, ToastController, IonRouterOutlet, ActionSheetController, AlertController, Platform } from '@ionic/angular';
import { ProfilePictureComponent } from '../profile/profile-picture/profile-picture.component';
import { ResourcesService, Resource } from 'src/app/shared/services/resources/resources.service';
import { EditChildComponent } from './edit-child/edit-child.component';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit {

  dark$: Observable<boolean>;

  team: Team;
  currentTeam: Team;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  teamId: string;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  resources$: Observable<Resource[]>
  subscriptions: Subscription[] = [];
  public page: string;
  member$: Observable<Member>;
  memberStatus: string;
  data: any;

  newResource: Resource = {
    url: null,
    name: null,
    level: 'Team',
    preview: null,
    id: null
  };

  desktop: boolean;
  ios: boolean;
  android: boolean;

  open: boolean = false;

  segment: string = 'members';

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private membersService: MembersService,
    private teamsService: TeamsService,
    private resourcesService: ResourcesService,
    private modalController: ModalController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private alertController: AlertController,
    private routerOutlet: IonRouterOutlet,
    private platform: Platform
  ) { }

  ngOnInit() {
    
    this.dark$ = this.store.select('dark');

    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    this.profile$ = this.store.select<Profile>('profile');

    this.member$ = this.profile$.pipe(
      takeUntil(this.onDestroy),
      filter(Boolean),
      switchMap((profile: Profile) => profile.uid ? this.membersService.getMember(profile.uid) : null)
    )

    this.members$ = this.store.select<Member[]>('members');
    this.groups$ = this.store.select<Group[]>('groups');
    this.resources$ = this.store.select<Resource[]>('resources');

    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id)));
  }

  onFocus(ev) {
    if (!this.open) {
      this.editChildModal();
    }
  }

  async editChildModal() {
    this.open = true;
    const modal = await this.modalController.create({
      component: EditChildComponent,
      componentProps: {
        'teamId': this.teamId
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
    });
    modal.onWillDismiss().then(data => {
      this.open = false;
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentTeamUpdateToast();
      }
    });
    return await modal.present();
  }

  async profilePictureModal() {
    const modal = await this.modalController.create({
      component: ProfilePictureComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
      componentProps: {
        'teamId': this.teamId,
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

  goTo(route: string, id: string) {
    this.router.navigate([`../Teams/${this.teamId}/${route}/${id}`]);
  }

  async editTeamModal() {
    const modal = await this.modalController.create({
      component: EditTeamComponent,
      componentProps: {
        'teamId': this.teamId,
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentToast();
      }
    });
    return await modal.present();
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: 'Your team was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  async presentActionSheet(linkId: string) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Warning: Permanent Action',
      buttons: [{
        text: 'Delete',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          console.log('Delete clicked');
          this.resourcesService.removeLink(linkId);

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

  async removeLink(linkId: string) {
    console.log(linkId);
    this.presentActionSheet(linkId);
  }

  async viewSite(link) {
    await Browser.open({ url: link.url });
  }

  async addResource() {
    const alert = await this.alertController.create({
      header: 'Add Team Resource',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Page name'
        },
        {
          name: 'url',
          type: 'text',
          placeholder: 'Page url (https://...)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Add',
          handler: data => {
            console.log('Confirm Add', data);
            this.newResource.url = data.url;
            this.newResource.name = data.name;
            if (!this.newResource.url.startsWith('https://') && (!this.newResource.url.startsWith('http://'))) {
              this.newResource.url = 'https://' + this.newResource.url;
            }
            this.resourcesService.addResource(this.newResource);
          }
        }
      ]
    });
    await alert.present();
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

}

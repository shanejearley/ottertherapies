import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ModalController, ToastController, IonRouterOutlet, AlertController, Platform, ActionSheetController } from '@ionic/angular';

import { AngularFirestore } from '@angular/fire/firestore'
import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil, take, map, filter } from 'rxjs/operators';

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';
import { MembersService, Member } from '../../shared/services/members/members.service';
import { ScanComponent } from './scan/scan.component';
import { BrowseComponent } from './browse/browse.component';
import { EditGroupComponent } from '../../shared/components/edit-group/edit-group.component';
import { CreateGroupComponent } from '../../shared/components/create-group/create-group.component';

import { Store } from 'src/store';
import { FileOptionsComponent } from 'src/app/shared/components/file-options/file-options.component';

@Component({
  selector: 'app-files',
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.scss'],
})
export class FilesComponent implements OnInit {
  desktop: boolean;
  ios: boolean;
  android: boolean;
  capacitor: boolean;

  date: Date;
  time: number;

  pdfData: string;
  photoName: string;
  photo: SafeResourceUrl;
  photoId: string;
  photoData: string;
  teamId: string;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  public data: any;
  private sheetData: any;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private teamsService: TeamsService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private groupsService: GroupsService,
    private membersService: MembersService,
    private authService: AuthService,
    private routerOutlet: IonRouterOutlet,
    private platform: Platform,
    private actionSheetController: ActionSheetController,
    private router: Router
  ) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios');
      this.android = this.platform.is('android');
      this.capacitor = this.platform.is('capacitor');
    })
    this.date = new Date();
    this.time = this.date.getTime();
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.members$ = this.store.select<Member[]>('members');

    this.team$ = this.activatedRoute.params
      .pipe(
        takeUntil(this.onDestroy),
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  goTo(route: string, id: string) {
    this.router.navigate([`../Teams/${this.teamId}/Files/${route}/${id}`]);
  }

  async fileOptions(file, folder) {
    const modal = await this.modalController.create({
      component: FileOptionsComponent,
      componentProps: {
        'teamId': this.teamId,
        'file': file,
        'folder': folder
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response === 'delete') {
        console.log('delete');
        this.presentActionSheet(folder, file.id, file.url);
      }
    });
    return await modal.present();
  }

  async presentActionSheet(folder, fileId: string, fileUrl: string) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Warning: Permanent Action',
      buttons: [{
        text: 'Delete',
        role: 'destructive',
        icon: 'trash',
        handler: async () => {
          console.log('Delete clicked');
          if (!folder.uid) {
            this.groupsService.removeFile(folder.id, fileId, fileUrl);
          } else {
            this.membersService.removeFile(folder.uid, fileId, fileUrl);
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

  scanDoc() {
    if (this.ios && this.capacitor || this.android && this.capacitor) {
      this.scanModal();
    } else if (this.desktop) {
      this.useMobileAlert();
    }
  }

  async useMobileAlert() {
    const alert = await this.alertController.create({
      // header: 'One sec!',
      // subHeader: 'Scanning is a mobile feature',
      message: 'Use the Otter mobile app to scan documents with your camera!',
      buttons: ['OK']
    });

    await alert.present();
  }

  async scanModal() {
    const modal = await this.modalController.create({
      component: ScanComponent,
      componentProps: {
        'teamId': this.teamId,
        'sourceId': 'files'
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
    });
    return await modal.present();
  }

  async browseModal() {
    const modal = await this.modalController.create({
      component: BrowseComponent,
      componentProps: {
        'teamId': this.teamId,
        'sourceId': 'files'
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
      message: 'Your upload was successful!',
      duration: 2000
    });
    toast.present();
  }

  get uid() {
    return this.authService.user.uid;
  }

  showMember(m) {
    m.show = !m.show;
    if (m.show) {
      setTimeout(async () => {
        const unread = await this.membersService.getMember(m.uid).pipe(filter(Boolean), take(1), map((member: Member) => member.unread), map(unread => unread)).toPromise();
        if (unread && unread.unreadFiles > 0) {
          this.membersService.checkLastFile(m.uid);
        }
      }, 2500);
    }
  }

  showGroup(g) {
    g.show = !g.show;
    if (g.show) {
      setTimeout(async () => {
        const unread = await this.groupsService.getGroup(g.id).pipe(filter(Boolean), take(1), map((group: Group) => group.unread), map(unread => unread)).toPromise();
        if (unread && unread.unreadFiles > 0) {
          this.groupsService.checkLastFile(g.id);
        }
      }, 2500);
    }
  }

  async editGroupModal(groupId) {
    const modal = await this.modalController.create({
      component: EditGroupComponent,
      componentProps: {
        'teamId': this.teamId,
        'groupId': groupId
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(async data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentUpdateToast();
      }
      if (this.data.response == 'deleted') {
        this.presentDeletingToast();
        setTimeout(() => {
          this.presentDeleteToast();
        }, 2000)
      }
    });
    return await modal.present();
  }

  async presentDeletingToast() {
    const toast = await this.toastController.create({
      message: 'Deleting your group...',
      duration: 2000
    });
    toast.present();
  }

  async presentDeleteToast() {
    const toast = await this.toastController.create({
      message: 'Your group was deleted!',
      duration: 2000
    });
    toast.present();
  }

  async presentUpdateToast() {
    const toast = await this.toastController.create({
      message: 'Your group was updated!',
      duration: 2000
    });
    toast.present();
  }

  async createGroupModal() {
    const modal = await this.modalController.create({
      component: CreateGroupComponent,
      componentProps: {
        'teamId': this.teamId,
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(async data => {
      this.data = data.data;
      if (this.data.response !== 'dismissed' && this.data.response !== 'error') {
        this.presentCreatingToast();
        setTimeout(() => {
          this.presentCreateToast();
        }, 4000)
      }
    });
    return await modal.present();
  }

  async presentCreatingToast() {
    const toast = await this.toastController.create({
      message: 'Creating your group...',
      duration: 4000
    });
    toast.present();
  }

  async presentCreateToast() {
    const toast = await this.toastController.create({
      message: 'Your group was created!',
      duration: 2000
    });
    toast.present();
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

}

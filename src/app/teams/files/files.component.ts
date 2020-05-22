import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ModalController, ToastController, IonRouterOutlet, AlertController, Platform, ActionSheetController } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
const { Browser } = Plugins;
import { AngularFirestore } from '@angular/fire/firestore'
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

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

import { DocumentScanner, DocumentScannerOptions } from '@ionic-native/document-scanner/ngx';

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-files',
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.scss'],
})
export class FilesComponent implements OnInit {
  desktop: boolean;
  ios: boolean;
  android: boolean;
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
  getProfileSub: Subscription;
  public team: string;
  public page: string;
  public data: any;
  private sheetData: any;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private teamsService: TeamsService,
    private documentScanner: DocumentScanner,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private sanitizer: DomSanitizer,
    private db: AngularFirestore,
    private groupsService: GroupsService,
    private membersService: MembersService,
    private authService: AuthService,
    private routerOutlet: IonRouterOutlet,
    private platform: Platform,
    private actionSheetController: ActionSheetController
  ) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.members$ = this.store.select<Member[]>('members');
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async presentActionSheet(type: string, folderId: string, fileId: string, fileUrl: string) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Warning: Permanent Action',
      buttons: [{
        text: 'Delete',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          console.log('Delete clicked');
          if (type === 'group') {
            console.log('Delete group file');
            return this.groupsService.removeFile(folderId, fileId, fileUrl);
          } else if (type === 'member') {
            return this.membersService.removeFile(folderId, fileId, fileUrl);
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

  generatePdf(data) {
    const docDefinition = { content: [{ image: 'data:image/jpg;base64,' + data, width: 612, height: 792, pageMargins: [40, 60, 40, 60] }] }
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBase64((data) => {
      this.pdfData = data;
      this.scanModal();
    });
  }

  scanDoc() {
    if (this.ios || this.android) {
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
    if (m.show && m.uid !== this.uid && m.unread && m.unread.unreadFiles) {
      this.membersService.checkLastFile(m.uid);
    }
  }

  showGroup(g) {
    g.show = !g.show;
    if (g.show && g.unread && g.unread.unreadFiles) {
      this.groupsService.checkLastFile(g.id);
    }
  }

  async removeGroupFile(groupId: string, fileId: string, fileUrl: string) {
    return this.presentActionSheet("group", groupId, fileId, fileUrl);
  }

  async removeMemberFile(memberUid: string, fileId: string, fileUrl: string) {
    return this.presentActionSheet("member", memberUid, fileId, fileUrl);
  }

  async previewFile(file) {
    await Browser.open({ url: file.url });
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
        // setTimeout(() => {
        //   return this.router.navigate([`../../Teams/${this.teamId}/Messages`]);
        // }, 4000)
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
        }, 2000)
        // setTimeout(() => {
        //   return this.router.navigate([`../Teams/${this.teamId}/Messages/Group/${this.data.response}`]);
        // }, 4000)
      }
    });
    return await modal.present();
  }

  async presentCreatingToast() {
    const toast = await this.toastController.create({
      message: 'Creating your group...',
      duration: 2000
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

}

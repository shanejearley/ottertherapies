import { Component, OnInit, ViewChild, ElementRef, HostListener, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonList, IonRouterOutlet, Platform, AlertController, ActionSheetController } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
const { Clipboard, Browser } = Plugins;

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil, filter, take, map } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { GroupsService, Group, Message } from '../../../shared/services/groups/groups.service';
import { Member } from '../../../shared/services/members/members.service';
import { EditGroupComponent } from '../../../shared/components/edit-group/edit-group.component';

import { Store } from 'src/store';
import { MessageFileComponent } from 'src/app/shared/components/message-file/message-file.component';

import moment from 'moment';
import { BrowseComponent } from '../browse/browse.component';
import { FileOptionsComponent } from 'src/app/shared/components/file-options/file-options.component';
import { ScanComponent } from '../scan/scan.component';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
})
export class GroupComponent implements OnInit {
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
    const fileList: FileList = $event.dataTransfer.files;
    console.log(fileList);
    let files = [];
    for (let i = 0; i < fileList.length; i++) {
      if (fileList.item(i).size > 25000000) {
        this.largeFileAlert();
      } else {
        files.push(fileList.item(i));
      }
    }
    if (files.length = fileList.length) {
      console.log(files);
      if (files.length > 0) {
        this.browseModal(files);
        files = [];
      }
    }
  }
  @ViewChildren('childFile') childFiles: QueryList<MessageFileComponent>;

  @ViewChild(IonContent, { static: false }) contentArea: IonContent;
  @ViewChild(IonList, { read: ElementRef, static: false }) scroll: ElementRef;
  private mutationObserver: MutationObserver;

  uid: string;

  ios: boolean;
  android: boolean;
  desktop: boolean;

  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  group$: Observable<Group>;
  groupId: string;
  teamId: string;
  public team: string;
  public page: string;
  date: Date;
  time: number;
  data: any;
  messages: Message[];
  group: Group;
  watch: boolean;

  newBody: string;
  newFiles: any = [];
  sending: boolean;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private groupsService: GroupsService,
    private alertController: AlertController,
    public modalController: ModalController,
    public toastController: ToastController,
    private platform: Platform,
    private routerOutlet: IonRouterOutlet,
    private router: Router,
    private actionSheetController: ActionSheetController
  ) { }

  checkUnread() {
    setTimeout(async () => {
      const unread = await this.group$.pipe(filter(Boolean), take(1), map((group: Group) => group.unread), map(unread => unread)).toPromise();
      if (unread && unread.unreadFiles > 0) {
        this.groupsService.checkLastFile(this.groupId);
      }
    }, 2500)
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
      message: 'Use the Otter mobile app to scan documents with your camera!',
      buttons: ['OK']
    });

    await alert.present();
  }

  async scanModal() {
    const group = await this.group$.pipe(filter(Boolean), take(1), map((group: Group) => group)).toPromise();
    const modal = await this.modalController.create({
      component: ScanComponent,
      componentProps: {
        'teamId': this.teamId,
        'folder': group
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
    });
    return await modal.present();
  }

  async browseModal(files) {
    const group = await this.group$.pipe(filter(Boolean), take(1), map((group: Group) => group)).toPromise();
    const modal = await this.modalController.create({
      component: BrowseComponent,
      componentProps: {
        'teamId': this.teamId,
        'folder': group,
        'files': files
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

  ionViewDidEnter() {
    this.group$.pipe(
      takeUntil(this.onDestroy),
      filter(Boolean),
      tap((group: Group) => {
        this.group = group;
        this.checkUnread();
        this.mutationObserver = new MutationObserver((mutations) => {
          this.checkUnread();
        })
        this.mutationObserver.observe(this.scroll.nativeElement, {
          childList: true
        });
      })).subscribe()
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
          this.groupsService.removeFile(folder.id, fileId, fileUrl);
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

  async largeFileAlert() {
    const alert = await this.alertController.create({
      message: 'Your file is larger than our limit of 25MB! Try a smaller version.',
      buttons: ['OK']
    });

    await alert.present();
  }

  async removeFile(file) {
    const index = this.newFiles.indexOf(file);
    return this.newFiles.splice(index, 1);
  }

  async previewFile(message) {
    await Browser.open({ url: message.body });
  }

  async ngOnInit() {
    this.uid = (await this.authService.user).uid;
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    this.date = new Date();
    this.time = moment(this.date).startOf('day').toDate().getTime();
    this.newBody = '';
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.members$ = this.store.select<Member[]>('members');
    this.group$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.groupId = param.groupId }),
        switchMap(param => this.groupsService.getGroup(param.groupId))
      );
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  async editGroupModal() {
    const modal = await this.modalController.create({
      component: EditGroupComponent,
      componentProps: {
        'teamId': this.teamId,
        'groupId': this.groupId
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    });
    modal.onWillDismiss().then(async data => {
      this.data = data.data;
      if (this.data.response == 'success') {
        this.presentToast();
      }
      if (this.data.response == 'deleted') {
        this.presentDeletingToast();
        setTimeout(() => {
          this.presentDeleteToast();
        }, 2000)
        setTimeout(() => {
          return this.router.navigate([`../../Teams/${this.teamId}/Files`]);
        }, 4000)
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

  async presentToast() {
    const toast = await this.toastController.create({
      message: 'Your group was updated! &#128079;',
      duration: 2000
    });
    toast.present();
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

}

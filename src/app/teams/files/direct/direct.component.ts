import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, HostListener, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, Platform, AlertController, ActionSheetController, ModalController, IonRouterOutlet, ToastController } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
const { Clipboard, Browser } = Plugins;

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil, filter, take, map } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { MembersService, Member } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';
import { MessageFileComponent } from 'src/app/shared/components/message-file/message-file.component';

import moment from 'moment';
import { ScanComponent } from '../scan/scan.component';
import { BrowseComponent } from '../browse/browse.component';
import { FileOptionsComponent } from 'src/app/shared/components/file-options/file-options.component';

@Component({
  selector: 'app-direct',
  templateUrl: './direct.component.html',
  styleUrls: ['./direct.component.scss'],
})
export class DirectComponent implements OnInit {
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
    if (files.length == fileList.length) {
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

  ios: boolean;
  android: boolean;
  desktop: boolean;

  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  members$: Observable<Member[]>;
  member$: Observable<Member>;
  directId: string;
  teamId: string;
  public team: string;
  public page: string;
  date: Date;
  time: number;
  watch: boolean;
  member: Member;

  newBody: string;
  newFiles: any = [];
  sending: boolean;

  data: any;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private membersService: MembersService,
    private platform: Platform,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private routerOutlet: IonRouterOutlet,
    private toastController: ToastController
  ) { }

  get uid() {
    return this.authService.user.uid;
  }

  get pathId() {
    return this.uid < this.directId ? this.uid + this.directId : this.directId + this.uid;
  }

  checkUnreadFiles() {
    setTimeout(async () => {
      const unread = await this.member$.pipe(filter(Boolean), take(1), map((member: Member) => member.unread), map(unread => unread)).toPromise();
      if (unread && unread.unreadFiles > 0) {
        this.membersService.checkLastFile(this.directId);
      }
    }, 2500);
  }

  ionViewDidEnter() {
    this.member$
      .pipe(
        takeUntil(this.onDestroy),
        filter(Boolean),
        tap((member: Member) => {
          this.member = member;
          this.checkUnreadFiles();
          this.mutationObserver = new MutationObserver((mutations) => {
            this.checkUnreadFiles();
          })
          this.mutationObserver.observe(this.scroll.nativeElement, {
            childList: true
          });
        })
      ).subscribe()
  }

  async largeFileAlert() {
    const alert = await this.alertController.create({
      message: 'Your file is larger than our limit of 25MB! Try a smaller version.',
      buttons: ['OK']
    });

    await alert.present();
  }

  async fileRead(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      console.log(file);
      reader.readAsDataURL(file);
      reader.onerror = () => {
        reader.abort();
        reject(new DOMException("Problem parsing input file."))
      }
      reader.onload = () => {
        resolve({ type: file.type, value: reader.result, name: file.name });
      };
    })
  }

  async fileDropEvent(files) {
    const dropPromises = files.map(async file => {
      const result = await this.fileRead(file);
      await this.newFiles.push(result);
    })
    return Promise.all(dropPromises);
  }

  async fileChangeEvent(ev) {
    const file = ev.target.files[0];
    if (file.size > 25000000) {
      return this.largeFileAlert();
    }
    const result = await this.fileRead(file);
    console.log('res', result)
    this.newFiles.push(result);
    return;
  }

  async removeFile(file) {
    const index = this.newFiles.indexOf(file);
    return this.newFiles.splice(index, 1);
  }

  public trackFn(index, item) {
    return item ? item.id : undefined;
  }

  async previewFile(file) {
    await Browser.open({ url: file.url ? file.url : file.body });
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
          this.membersService.removeFile(folder.uid, fileId, fileUrl);
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
    const member = await this.member$.pipe(filter(Boolean), take(1), map((member: Member) => member)).toPromise();
    const modal = await this.modalController.create({
      component: ScanComponent,
      componentProps: {
        'teamId': this.teamId,
        'folder': member
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
    const member = await this.member$.pipe(filter(Boolean), take(1), map((member: Member) => member)).toPromise();
    const modal = await this.modalController.create({
      component: BrowseComponent,
      componentProps: {
        'teamId': this.teamId,
        'folder': member,
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

  async presentToast() {
    const toast = await this.toastController.create({
      message: 'Your upload was successful!',
      duration: 2000
    });
    toast.present();
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

  ngOnInit() {
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
    this.members$ = this.store.select<Member[]>('members');
    this.member$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.directId = param.directId }),
        switchMap(param => this.membersService.getMember(param.directId))
      );
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

}

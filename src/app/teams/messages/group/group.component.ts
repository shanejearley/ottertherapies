import { Component, OnInit, ViewChild, ElementRef, HostListener, ViewChildren, QueryList } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonList, IonRouterOutlet, Platform, AlertController } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
const { Clipboard, Browser } = Plugins;

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { GroupsService, Group, Message } from '../../../shared/services/groups/groups.service';
import { Member } from '../../../shared/services/members/members.service';
import { EditGroupComponent } from '../../../shared/components/edit-group/edit-group.component';

import { Store } from 'src/store';
import { MessageFileComponent } from 'src/app/shared/components/message-file/message-file.component';

import moment from 'moment';

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
      files.push(fileList.item(i));
      console.log(files);
      if (files.length = fileList.length) {
        console.log(files);
        this.fileDropEvent(files);
        files = [];
      }
    }
  }
  @ViewChildren('childFile') childFiles:QueryList<MessageFileComponent>;

  @ViewChild(IonContent) contentArea: IonContent;
  @ViewChild(IonList, { read: ElementRef }) scroll: ElementRef;

  ios: boolean;
  android: boolean;
  desktop: boolean;

  private mutationObserver: MutationObserver;
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
    private router: Router
  ) { }

  ngAfterViewInit() {
    this.watch = true;
    this.group$.pipe(
      takeUntil(this.onDestroy),
      tap(group => {
      if (group && group.messages.length) {
        console.log('update!', group.messages);
        this.group = group;
        this.scrollToBottom(0);
        if (this.watch) {
          this.checkUnread();
          this.mutationObserver = new MutationObserver((mutations) => {
            this.scrollToBottom(500);
            this.checkUnread();
          })
          this.mutationObserver.observe(this.scroll.nativeElement, {
            childList: true
          });
        }
      }
    })).subscribe()
  }

  checkUnread() {
    if (this.group.unread && this.group.unread.unreadMessages > 0) {
      this.groupsService.checkLastMessage(this.groupId);
    }
    setTimeout(() => {
      if (this.group.unread && this.group.unread.unreadMessages > 0) {
        this.groupsService.checkLastMessage(this.groupId);
      }
    }, 5000)
  }

  scrollToBottom(duration) {
    if (this.contentArea && this.contentArea.scrollToBottom) {
      setTimeout(() => {
        this.contentArea.scrollToBottom(duration);
      })
    }
  }

  async onPaste(ev) {
    console.log(ev);
    const result = await Clipboard.read();
    console.log('Got', result.type, 'from clipboard:', result.value);
    if (result.type !== 'text/plain') {
      await this.newFiles.push(result);
      return this.scrollOnFocus();
    } else {
      return false;
    }
  }

  async largeFileAlert() {
    const alert = await this.alertController.create({
      // header: 'One sec!',
      // subHeader: 'Scanning is a mobile feature',
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
      try {
        if (file.size > 25000000) {
          return this.largeFileAlert();
        }
        const result = await this.fileRead(file);
        await this.newFiles.push(result);
        return this.scrollOnFocus();
      } catch (err) {
        return console.log(err.message);
      }
    })
    return Promise.all(dropPromises);
  }

  async fileChangeEvent(ev) {
    const file = ev.target.files[0];
    try {
      if (file.size > 25000000) {
        return this.largeFileAlert();
      }
      const result = await this.fileRead(file);
      console.log('res', result)
      await this.newFiles.push(result);
      return this.scrollOnFocus();
    } catch (err) {
      return console.log(err.message);
    }
  }

  async removeFile(file) {
    const index = this.newFiles.indexOf(file);
    return this.newFiles.splice(index, 1);
  }

  async previewFile(message) {
    await Browser.open({ url: message.body });
  }

  scrollOnFocus() {
    setTimeout(() => {
      this.scrollToBottom(500);
    }, 750)
  }

  checkSendMessage() {
    if (this.desktop) {
      this.sendMessage();
    }
  }

  onKeydown(event) {
    if (this.desktop) {
      event.preventDefault();
    }
  }

  resetSender() {
    this.newFiles = [];
    this.newBody = '';
    this.sending = false;
  }

  async sendMessage() {
    this.sending = true;
    if (this.newFiles.length && this.childFiles.length) {
      const uploadPromises = this.childFiles.map(async child => {
        const upload = await child.upload();
        return console.log(upload);
      });
      await Promise.all(uploadPromises);
    }
    if (this.newBody.length) {
      await this.groupsService.addMessage(this.newBody, this.groupId, "message", null);
    }
    return this.resetSender();
  }

  get uid() {
    return this.authService.user.uid;
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
          return this.router.navigate([`../../Teams/${this.teamId}/Messages`]);
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
    this.watch = false;
    this.onDestroy.next();
  }

}

import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, HostListener, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, Platform, AlertController } from '@ionic/angular';

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
    if (files.length = fileList.length) {
      console.log(files);
      this.fileDropEvent(files);
      files = [];
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

  newBody: string = '';
  newFiles: any = [];
  sending: boolean;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private membersService: MembersService,
    private platform: Platform,
    private alertController: AlertController
  ) { }

  get pathId() {
    return this.uid < this.directId ? this.uid + this.directId : this.directId + this.uid;
  }

  checkUnread() {
    setTimeout(async () => {
      const unread = await this.member$.pipe(filter(Boolean), take(1), map((member: Member) => member.unread), map(unread => unread)).toPromise();
      if (unread && unread.unreadMessages > 0) {
        this.membersService.checkLastMessage(this.directId);
      }
    }, 2500)
  }

  ionViewDidEnter() {
    this.member$
      .pipe(
        takeUntil(this.onDestroy),
        filter(Boolean),
        tap((member: Member) => {
          this.member = member;
          this.checkUnread();
          this.scrollToBottom(0);
          this.mutationObserver = new MutationObserver((mutations) => {
            this.scrollToBottom(500);
            this.checkUnread();
          })
          this.mutationObserver.observe(this.scroll.nativeElement, {
            childList: true
          });
        })
      ).subscribe()
  }

  scrollToBottom(duration) {
    if (this.contentArea && this.contentArea.scrollToBottom) {
      setTimeout(() => {
        this.contentArea.scrollToBottom(duration);
      })
    }
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
      const result = await this.fileRead(file);
      await this.newFiles.push(result);
      return this.scrollOnFocus();
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
    await this.newFiles.push(result);
    return this.scrollOnFocus();
  }

  async removeFile(file) {
    const index = this.newFiles.indexOf(file);
    return this.newFiles.splice(index, 1);
  }

  async previewFile(message) {
    await Browser.open({ url: message.body });
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
      await this.membersService.addMessage(this.newBody, this.directId, "message", null);
    }
    return this.resetSender();
  }

  onKeydown(event) {
    if (this.desktop) {
      event.preventDefault();
    }
  }

  public trackFn(index, item) {
    return item ? item.id : undefined;
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

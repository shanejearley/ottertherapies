import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, Platform } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
const { Clipboard, Browser } = Plugins;

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { MembersService, Member } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';
import { MessageFileComponent } from 'src/app/shared/components/message-file/message-file.component';

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
      files.push(fileList.item(i));
      console.log(files);
      if (files.length = fileList.length) {
        console.log(files);
        this.fileDropEvent(files);
        files = [];
      }
    }
  }
  finished = false;
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
  members$: Observable<Member[]>;
  member$: Observable<Member>;
  directId: string;
  pathId: string;
  teamId: string;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  date: Date;
  time: number;
  memberSub: Subscription;
  watch: boolean;
  member: Member;

  newBody: string;
  newFiles: any = [];
  sending: boolean;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private teamsService: TeamsService,
    private membersService: MembersService,
    private platform: Platform
  ) { }

  ngAfterViewInit() {
    this.watch = true;
    this.member$
      .pipe(
        takeUntil(this.onDestroy),
        tap(member => {
          if (member && member.messages.length) {
            this.member = member;
            if (this.watch) {
              this.scrollToBottom(0);
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
        })
      ).subscribe()
  }

  checkUnread() {
    if (this.member.unread && this.member.unread.unreadMessages > 0) {
      this.membersService.checkLastMessage(this.directId);
    }
    setTimeout(() => {
      if (this.member.unread && this.member.unread.unreadMessages > 0) {
        this.membersService.checkLastMessage(this.directId);
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

  async fileRead(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      console.log(file);
      if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/gif') {
        reader.readAsDataURL(file);
        reader.onerror = () => {
          reader.abort();
          reject(new DOMException("Problem parsing input file."))
        }
        reader.onload = () => {
          resolve({ type: file.type, value: reader.result, name: file.name });
        };
      } else {
        resolve({ type: file.type, value: file, name: file.name })
      }
    })
  }

  async fileDropEvent(files) {
    const dropPromises = files.map(async file => {
      try {
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

  get uid() {
    return this.authService.user.uid;
  }

  public trackFn(index, item) {
    return item ? item.id : undefined;
  }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.desktop = this.platform.is('desktop');
      this.ios = this.platform.is('ios') && this.platform.is('capacitor');
      this.android = this.platform.is('android') && this.platform.is('capacitor');
      console.log(this.desktop, this.ios, this.android)
    })
    
    this.date = new Date();
    this.time = this.date.getTime();
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
    this.watch = false;
    this.onDestroy.next();
  }

}

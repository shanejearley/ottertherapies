import { Component, OnInit, ViewChild, ElementRef, HostListener, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, Config, ModalController, ToastController, IonRouterOutlet, AlertController, Platform, ActionSheetController } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
const { Clipboard, Browser } = Plugins;

import { Observable, Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap, takeUntil, filter, map, take } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { MembersService, Member, Message, Direct } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';
import { ScanComponent } from '../../files/scan/scan.component';
import { BrowseComponent } from '../../files/browse/browse.component';
import { MessageFileComponent } from 'src/app/shared/components/message-file/message-file.component';
import { FileOptionsComponent } from 'src/app/shared/components/file-options/file-options.component';

import moment from 'moment';

@Component({
    selector: 'app-member',
    templateUrl: './member.component.html',
    styleUrls: ['./member.component.scss'],
})
export class MemberComponent implements OnInit, AfterViewInit {

    dark$: Observable<boolean>;

    @HostListener('dragover', ['$event'])
    onDragOver($event) {
        $event.preventDefault();
    }

    @HostListener('dragleave', ['$event'])
    onDragLeave($event) {
        $event.preventDefault();
    }

    @HostListener('drop', ['$event'])
    async onDrop($event) {
        $event.preventDefault();
        if (this.segment === 'messages' || this.segment === 'files') {
            const fileList: FileList = $event.dataTransfer.files;
            console.log(fileList);
            let files = [];
            for (let i = 0; i < fileList.length; i++) {
                if (fileList.item(i).size > 25000000) {
                    return this.largeFileAlert();
                }
                files.push(fileList.item(i));
            }
            if (files.length = fileList.length) {
                console.log(files);
                if (this.segment === 'messages') {
                    return this.fileDropEvent(files);
                } else if (this.segment === 'files') {
                    if (files.length > 0) {
                        this.browseModal(files);
                    }
                }
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
    members$: Observable<Member[]>;
    member$: Observable<Member>;
    directId: string;
    teamId: string;
    subscriptions: Subscription[] = [];
    public team: string;
    public page: string;
    date: Date;
    time: number;
    segment: string = 'info';
    member: Member;
    data: any;

    newBody: string;
    newFiles: any = [];
    browseFiles: File[] = [];
    sending: boolean;

    private readonly onDestroy = new Subject<void>();

    constructor(
        private store: Store,
        private activatedRoute: ActivatedRoute,
        private authService: AuthService,
        private teamsService: TeamsService,
        private membersService: MembersService,
        private modalController: ModalController,
        private toastController: ToastController,
        private routerOutlet: IonRouterOutlet,
        private alertController: AlertController,
        private platform: Platform,
        private actionSheetController: ActionSheetController
    ) { }

    ngAfterViewInit() {

    }

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

    checkUnreadFiles() {
        setTimeout(async () => {
            const unread = await this.member$.pipe(filter(Boolean), take(1), map((member: Member) => member.unread), map(unread => unread)).toPromise();
            if (unread && unread.unreadFiles > 0) {
                this.membersService.checkLastFile(this.directId);
            }
        }, 2500);
    }

    segmentChanged(event) {
        if (event.detail.value === 'messages') {
            this.member$.pipe(
                filter(Boolean),
                takeUntil(this.onDestroy),
                tap((member: Member) => {
                    this.member = member;
                    this.scrollToBottom(0);
                    this.mutationObserver = new MutationObserver((mutations) => {
                        this.scrollToBottom(500);
                        this.checkUnread();
                    });
                    this.mutationObserver.observe(this.scroll.nativeElement, {
                        childList: true
                    });
                    this.checkUnread();
                })).subscribe()
        } else if (event.detail.value === 'files') {
            this.onDestroy.next();
            this.checkUnreadFiles();
        } else {
            this.onDestroy.next();
        }

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
            if (this.segment === 'messages') {
                const result = await this.fileRead(file);
                await this.newFiles.push(result);
                return this.scrollOnFocus();
            }
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

        this.dark$ = this.store.select('dark');

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
                takeUntil(this.onDestroy),
                tap(param => { this.directId = param.directId }),
                switchMap(param => this.membersService.getMember(param.directId))
            );
        this.team$ = this.activatedRoute.params
            .pipe(
                takeUntil(this.onDestroy),
                tap(param => { this.teamId = param.id }),
                switchMap(param => this.teamsService.getTeam(param.id))
            );
            
    }

    ngOnDestroy() {
        this.onDestroy.next();
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
            // header: 'One sec!',
            // subHeader: 'Scanning is a mobile feature',
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

}
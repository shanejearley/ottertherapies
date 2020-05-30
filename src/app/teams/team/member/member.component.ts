import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, Config, ModalController, ToastController, IonRouterOutlet, AlertController, Platform } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
const { Browser } = Plugins;

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators'

import { AuthService, User } from '../../../../auth/shared/services/auth/auth.service';
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../../shared/services/teams/teams.service';
import { MembersService, Member, Message, Direct } from '../../../shared/services/members/members.service';

import { Store } from 'src/store';
import { ScanComponent } from '../../files/scan/scan.component';
import { BrowseComponent } from '../../files/browse/browse.component';

@Component({
    selector: 'app-member',
    templateUrl: './member.component.html',
    styleUrls: ['./member.component.scss'],
})
export class MemberComponent implements OnInit {
    finished = false;
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
    newBody: string;
    directId: string;
    pathId: string;
    teamId: string;
    subscriptions: Subscription[] = [];
    public team: string;
    public page: string;
    date: Date;
    time: number;
    segment: string = 'info';
    memberSub: Subscription;
    watch: boolean;
    member: Member;
    data: any;

    constructor(
        private store: Store,
        private activatedRoute: ActivatedRoute,
        private authService: AuthService,
        private teamsService: TeamsService,
        private membersService: MembersService,
        private config: Config,
        private modalController: ModalController,
        private toastController: ToastController,
        private routerOutlet: IonRouterOutlet,
        private alertController: AlertController,
        private platform: Platform
    ) { }

    ngAfterViewInit() {

    }

    segmentChanged(event) {
        if (event.detail.value == 'messages') {
            this.watch = true;
            this.memberSub = this.member$.subscribe(member => {
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
        } else if (event.detail.value !== 'messages') {
            this.watch = false;
        }

    }

    checkUnread() {
        if (this.member.unread.unreadMessages > 0) {
            this.membersService.checkLastMessage(this.directId);
        }
        setTimeout(() => {
            if (this.member.unread.unreadMessages > 0) {
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

    sendMessage() {
        this.membersService.addMessage(this.newBody, this.directId, "message", null);
        this.newBody = '';
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
        this.watch = false;
        if (this.memberSub && !this.memberSub.closed) {
            this.memberSub.unsubscribe();
        }
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    async previewFile(file) {
        await Browser.open({ url: file.url });
    }

    removeMemberFile(memberUid, fileId, fileUrl) {
        return this.membersService.removeFile(memberUid, fileId, fileUrl);
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
                'sourceId': this.directId
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
                'sourceId': this.directId
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

}
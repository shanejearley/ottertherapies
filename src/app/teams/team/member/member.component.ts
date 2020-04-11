import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonList, Config } from '@ionic/angular';

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

    constructor(
        private store: Store,
        private activatedRoute: ActivatedRoute,
        private authService: AuthService,
        private teamsService: TeamsService,
        private membersService: MembersService,
        private config: Config
    ) { }

    ngAfterViewInit() {

    }
    
    segmentChanged(event) {
        this.member$.subscribe(member => {
            if (member && member.messages.length) {
                this.scrollToBottom(0);
                this.checkUnread();
            }
        })
        this.mutationObserver = new MutationObserver((mutations) => {
            this.scrollToBottom(500);
            this.checkUnread();
        })
        this.mutationObserver.observe(this.scroll.nativeElement, {
            childList: true
        });
    }

    checkUnread() {
        this.member$.pipe(tap(member => {
            if (member.unread.unreadMessages > 0) {
                this.membersService.checkLastMessage(this.directId);
            }
            setTimeout(() => {
                if (member.unread.unreadMessages > 0) {
                    this.membersService.checkLastMessage(this.directId);
                }
            }, 5000)
        })).subscribe();
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

    sendMessage() {
        this.membersService.addMessage(this.newBody, this.directId);
        this.newBody = '';
    }

    onKeydown(event) {
        event.preventDefault();
    }

    get uid() {
        return this.authService.user.uid;
    }

    public trackFn(index, item) {
        return item ? item.id : undefined;
    }

    ngOnInit() {
        this.ios = this.config.get('mode') === 'ios';
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
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    async previewFile(file) {
        await Browser.open({ url: file.url });
    }

    removeMemberFile(memberUid, fileId, fileUrl) {
        return this.membersService.removeFile(memberUid, fileId, fileUrl);
    }

}
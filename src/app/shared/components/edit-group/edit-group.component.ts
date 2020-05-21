import { Component } from '@angular/core';
import { NavParams, ModalController, ActionSheetController } from '@ionic/angular';

import { Observable, Subject } from 'rxjs';
import { map, tap, takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Member } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';
import { GroupsService, Group } from 'src/app/shared/services/groups/groups.service';

@Component({
    selector: 'app-edit-group',
    templateUrl: 'edit-group.component.html',
    styleUrls: ['./edit-group.component.scss']
})
export class EditGroupComponent {
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    filterMembers$: Observable<Member[]>;

    group$: Observable<Group>;
    group;
    memberStatus;
    remove = [];
    teamId: string;
    groupId: string;
    selected: string;
    queryText = '';
    filteredMembers: Member[];
    error: boolean;

    private readonly onDestroy = new Subject<void>();


    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private groupsService: GroupsService,
        private actionSheetController: ActionSheetController
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.groupId = this.navParams.get('groupId');
        this.group$ = this.groupsService.getGroup(this.groupId);
        this.group$.pipe(
            takeUntil(this.onDestroy),
            tap(g => {
                this.group = g;
            })
        ).subscribe();
        this.members$ = this.store.select<Member[]>('members');
        this.members$.pipe(
            takeUntil(this.onDestroy),
            map(members => {
                if (this.group.members && this.group.members.length) {
                    console.log(this.group.members)
                    this.group.members.forEach(g => {
                        if (this.uid === g.uid) {
                            this.memberStatus = g.status;
                            console.log(g.status);
                        }
                    })
                    members.forEach(m => {
                        if (this.group.members.filter(groupMember => groupMember.uid == m.uid)[0]) {
                            m.isChecked = true;
                        } else {
                            m.isChecked = false;
                        }
                    })
                }
            })
        ).subscribe()

        this.filterMembers$ = this.members$.pipe(
            map(members => this.queryText.length ? members.filter((member: Member) => member.profile.displayName.toLowerCase().includes(this.queryText.toLowerCase()) || member.profile.email.toLowerCase().includes(this.queryText.toLowerCase())) : members.filter((member: Member) => true))
        )
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
    }

    async presentActionSheet() {
        const actionSheet = await this.actionSheetController.create({
            header: 'Warning: Permanent Action',
            buttons: [{
                text: 'Delete',
                role: 'destructive',
                icon: 'trash',
                handler: async () => {
                    console.log('Delete clicked');
                    await this.groupsService.removeGroup(this.groupId);
                    return this.dismiss();
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

    async removeGroup() {
        return this.presentActionSheet();
    }

    updateGroup() {
        try {
            this.groupsService.updateGroup(this.group, this.remove);
        } catch (err) {
            return this.modalController.dismiss({
                response: err
            })
        }
        return this.modalController.dismiss({
            response: 'success'
        });
    }

    removeMember(m) {
        m.isChecked = !m.isChecked;
        var index = this.group.members.indexOf(m);
        this.group.members.splice(index, 1);
        this.remove.push(m.uid);
    }

    addMember(m) {
        this.error = false;
        if (!m.isChecked && m.uid !== this.uid) {
            m.isChecked = !m.isChecked;
            this.group.members.push(m);
        } else {
            console.log('Already a member');
        }
        this.queryText = '';
    }

    manualSearch() {
        this.members$.pipe(
            takeUntil(this.onDestroy),
            map(members => {
                if (members) {
                    if (members.filter(m => m.profile.displayName == this.queryText || m.profile.email == this.queryText)[0]) {
                        this.addMember(members.filter(m => m.profile.displayName == this.queryText || m.profile.email == this.queryText)[0]);
                    } else {
                        this.error = true;
                        console.log('No member found');
                    }
                }
            })
        ).subscribe();
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
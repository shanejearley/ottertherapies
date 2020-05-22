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

    group$: Observable<Group>;
    group;
    memberStatus;
    remove = [];
    teamId: string;
    groupId: string;
    selected: string;
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
                    return this.modalController.dismiss({
                        response: 'deleted'
                    });
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

    nameChange() {
        if (this.group.name && this.group.name.length) {
            this.error = false;
        }
    }

    updateGroup() {
        if (!this.group.name || !this.group.name.length) {
            this.error = true;
        } else {
            this.error = false;
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
    }

    onChange(m) {
        if (m.isChecked) {
            return this.addMember(m);
        } else {
            return this.removeMember(m);
        }
    }

    async removeMember(m) {
        const index = this.group.members.indexOf(m);
        await this.group.members.splice(index, 1);
        return this.remove.push(m.uid);
    }

    addMember(m) {
        return this.group.members.push(m);
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
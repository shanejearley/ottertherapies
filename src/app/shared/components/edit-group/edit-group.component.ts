import { Component } from '@angular/core';
import { NavParams, ModalController, ActionSheetController } from '@ionic/angular';

import { Observable, Subject } from 'rxjs';
import { map, tap, takeUntil, take, filter } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Member } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';
import { GroupsService, Group } from 'src/app/shared/services/groups/groups.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-edit-group',
    templateUrl: 'edit-group.component.html',
    styleUrls: ['./edit-group.component.scss']
})
export class EditGroupComponent {

    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    parent: string;

    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    members: Member[];
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
        private actionSheetController: ActionSheetController,
        private router: Router
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
    }

    async ionViewWillEnter() {
        this.parent = this.router.url.split('/').pop();
        this.teamId = this.navParams.get('teamId');
        this.groupId = this.navParams.get('groupId');
        this.group$ = this.groupsService.getGroup(this.groupId);
        this.members$ = this.store.select<Member[]>('members');
        this.group = await this.group$.pipe(filter(Boolean), take(1), map(g => g)).toPromise();
        this.members = await this.members$.pipe(filter(Boolean), take(1), map((ms: Member[]) => ms)).toPromise();
        if (this.group.members && this.group.members.length) {
            console.log(this.group.members)
            this.group.members.map(g => {
                if (this.uid === g.uid) {
                    this.memberStatus = g.status;
                    console.log(g.status);
                }
            })
            this.members.map(m => {
                if (this.group.members.filter(groupMember => groupMember.uid == m.uid)[0]) {
                    m.isChecked = true;
                } else {
                    m.isChecked = false;
                }
            })
        }
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

    nameChange(ev) {
        this.group.name = ev.detail.value;
        if (this.group.name && this.group.name.length) {
            this.error = false;
        }
    }

    updateGroup() {
        console.log(this.group, this.remove);
        // if (!this.group.name || !this.group.name.length) {
        //     this.error = true;
        // } else {
        //     this.error = false;
        //     try {
        //         this.groupsService.updateGroup(this.group, this.remove);
        //     } catch (err) {
        //         return this.modalController.dismiss({
        //             response: err
        //         })
        //     }
        //     return this.modalController.dismiss({
        //         response: 'success'
        //     });
        // }
    }

    onChange(ev, m) {
        if (ev.detail.checked) {
            const remove = this.remove.find(r => r === m.uid);
            if (remove) {
                console.log(remove);
                const removeIndex = this.remove.indexOf(remove);
                this.remove.splice(removeIndex, 1);
            }
            if (!this.group.members.find(g => g.uid === m.uid)) {
                return this.addMember(m);
            } else {
                return console.log('Member already added');
            }
        } else if (!ev.detail.checked) {
            if (this.group.members.find(g => g.uid === m.uid) && !this.remove.find(r => r === m.uid)) {
                return this.removeMember(m);
            } else {
                return console.log('Member already removed');
            }
        }
    }

    async removeMember(m) {
        return this.remove.push(m.uid);
    }

    addMember(m) {
        return this.group.members.push(m);
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
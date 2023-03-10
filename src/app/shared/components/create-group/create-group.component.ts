import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { Observable, Subject } from 'rxjs';
import { map, tap, takeUntil, filter } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Member } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';
import { GroupsService, Group } from 'src/app/shared/services/groups/groups.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
    selector: 'app-create-group',
    templateUrl: 'create-group.component.html',
    styleUrls: ['./create-group.component.scss']
})
export class CreateGroupComponent {
    uid: string;
    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    parent: string;

    newGroup = {
        name: null,
        members: []
    };
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;

    group$: Observable<Group>;
    group;
    teamId: string;
    groupId: string;
    selected: string;
    error: string;

    clicked: boolean;

    private readonly onDestroy = new Subject<void>();


    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private groupsService: GroupsService,
        private db: AngularFirestore,
        private router: Router
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;

        this.profile$ = this.store.select<Profile>('profile');
    }

    ionViewWillEnter() {
        this.parent = this.router.url.split('/').pop();
        this.teamId = this.navParams.get('teamId');
        this.members$ = this.store.select<Member[]>('members');
        this.members$.pipe(
            takeUntil(this.onDestroy),
            map(members => {
                members.forEach(m => {
                    if (m.uid == this.uid) {
                        m.isChecked = true;
                        this.newGroup.members.push(m);
                    } else {
                        m.isChecked = false;
                    }
                })
            })
        ).subscribe()
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    nameChange() {
        if (this.newGroup.name && this.newGroup.name.length && this.error === 'You need a group name.') {
            this.error = null;
        }
    }

    async addGroup() {
        if (!this.newGroup.name || !this.newGroup.name.length) {
            this.error = 'You need a group name.';
            this.clicked = false;
        } else {
            this.error = null;
            const newGroupId = this.db.createId();
            try {
                this.clicked = true;
                await this.groupsService.addGroup(newGroupId, this.newGroup).then((ev) => {
                    console.log(ev);
                });
                return this.modalController.dismiss({
                    response: newGroupId
                });
            } catch (err) {
                this.error = err.message;
                this.clicked = false;
                console.log(err);
            }
        }
    }

    onChange(m) {
        if (m.isChecked) {
            return this.addMember(m);
        } else {
            return this.removeMember(m);
        }
    }

    removeMember(m) {
        const index = this.newGroup.members.indexOf(m);
        return this.newGroup.members.splice(index, 1);
    }

    addMember(m) {
        return this.newGroup.members.push(m);
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import * as moment from 'moment';

import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

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
    remove = [];
    teamId: string;
    groupId: string;
    selected: string;
    queryText = '';
    filteredMembers: Member[];
    error: boolean;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private groupsService: GroupsService
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.groupId = this.navParams.get('groupId');
        this.group$ = this.groupsService.getGroup(this.groupId);
        this.group$.pipe(tap(g => { 
            this.group = g;
        })).subscribe();
        this.members$ = this.store.select<Member[]>('members');
        this.members$.pipe(map(members => {
            if (this.group.members && this.group.members.length) {
                members.forEach(m => {
                    if (this.group.members.filter(groupMember => groupMember.uid == m.uid)[0]) {
                        m.isChecked = true;
                    } else {
                        m.isChecked = false;
                    }
                })
            }
        })).subscribe()
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
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
        this.members$.pipe(map(members => {
            if (members) {
                if (members.filter(m => m.profile.displayName == this.queryText || m.profile.email == this.queryText)[0]) {
                    this.addMember(members.filter(m => m.profile.displayName == this.queryText || m.profile.email == this.queryText)[0]);
                } else {
                    this.error = true;
                    console.log('No member found');
                }
            }
        })).subscribe();
    }

    filterMembers(search: string) {
        this.members$.pipe(map(members => {
            if (members) {
                if (search.length) {
                    this.filteredMembers = members.filter(o =>
                        Object.keys(o).some(k => {
                            if (typeof o[k] === 'string')
                                return o[k].toLowerCase().includes(search.toLowerCase());
                        })
                    );
                } else {
                    this.filteredMembers = members;
                }
            }
        })).subscribe()
    }
}
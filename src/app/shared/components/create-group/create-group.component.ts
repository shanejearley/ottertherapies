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
    selector: 'app-create-group',
    templateUrl: 'create-group.component.html',
    styleUrls: ['./create-group.component.scss']
})
export class CreateGroupComponent {
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
        this.members$ = this.store.select<Member[]>('members');
        this.members$.pipe(map(members => {
            members.forEach(m => {
                if (m.uid == this.uid) {
                    m.isChecked = true;
                    this.newGroup.members.push(m);
                } else {
                    m.isChecked = false;
                }
            })
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

    addGroup() {
        try {
            this.groupsService.addGroup(this.newGroup).then((ev) => {
                console.log(ev);
            });
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
        var index = this.newGroup.members.indexOf(m);
        this.newGroup.members.splice(index, 1);
    }

    addMember(m) {
        this.error = false;
        if (!m.isChecked && m.uid !== this.uid) {
            m.isChecked = !m.isChecked;
            this.newGroup.members.push(m);
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
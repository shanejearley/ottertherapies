import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { Observable } from 'rxjs';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Profile } from '../../../../auth/shared/services/profile/profile.service';
import { Member, MembersService } from '../../../shared/services/members/members.service';
import { Store } from 'src/store';
import { Team, TeamsService } from 'src/app/shared/services/teams/teams.service';

@Component({
    selector: 'app-edit-team',
    templateUrl: 'edit-team.component.html',
    styleUrls: ['./edit-team.component.scss']
})
export class EditTeamComponent {

    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    emailFocus: boolean = false;

    team$: Observable<Team>;
    profile$: Observable<Profile>;
    memberStatus: string;
    members$: Observable<Member[]>;
    member$: Observable<Member>;
    members: Member[];
    newMembers: any[] = [];
    removeMembers: any[] = [];
    removePendingMembers: any[] = [];
    teamId: string;
    email = '';
    error: boolean;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private membersService: MembersService,
        private teamsService: TeamsService
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.team$ = this.teamsService.getTeam(this.teamId);
        this.members$ = this.store.select<Member[]>('members');
        this.members$.subscribe(members => {
            this.members = members;
            this.members.forEach(m => {
                m.isChecked = true;
            })
        })
        this.profile$.subscribe(profile => {
            if (profile) {
                this.member$ = this.membersService.getMember(profile.uid);
                this.member$.subscribe(m => {
                    this.memberStatus = m.status;
                    m.pending.forEach(p => {
                        p.isChecked = true;
                    })
                })
            }
        });
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    get uid() {
        return this.authService.user.uid;
    }

    async updateMembers() {
        try {
            await this.membersService.updateMembers(this.newMembers, this.removeMembers, this.removePendingMembers);
            return this.modalController.dismiss({
                response: 'success'
            });
        } catch (err) {
            return this.modalController.dismiss({
                response: err
            })
        }
    }

    removeMember(m) {
        m.isChecked = !m.isChecked;
        this.removeMembers.push(m.uid);
    }

    removePendingMember(p) {
        p.isChecked = !p.isChecked;
        this.removePendingMembers.push(p);
    }

    addMember() {
        this.error = false;
        const exists = this.members.find(m => m.email === this.email);
        if (!exists) {
            this.newMembers.push(this.email);
        } else {
            this.error = true;
            console.log('Already a member');
        }
        this.email = '';
    }

    removeNewMember(m) {
        var index = this.newMembers.indexOf(m);
        this.newMembers.splice(index, 1);
    }

}
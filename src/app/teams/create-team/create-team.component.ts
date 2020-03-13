import { Component, Input } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';
import { Team } from 'src/app/shared/services/teams/teams.service';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';

@Component({
    selector: 'app-create-team',
    templateUrl: 'create-team.component.html',
    styleUrls: ['./create-team.component.scss']
})
export class CreateTeamComponent {
    newTeam: Team = {
        id: null,
        name: null,
        publicId: null,
        child: null,
        bio: null,
        notes: null,
        url: null,
        createdBy: null,
        unread: null,
        unreadMessages: null,
        unreadFiles: null,
        unreadNotes: null
    };
    newMembers = [];
    member: string;
    constructor(
        public navParams: NavParams, 
        public modalController: ModalController,
        private authService: AuthService
    ) {}
    ionViewWillEnter() {
        //this.newMembers.push(this.email);
        //this.photo = this.navParams.get('photo');
    }

    ngOnInit() {
        this.newMembers.push(this.email);
    }

    get email() {
        return this.authService.user.email;
    }

    addMember() {
        this.newMembers.push(this.member);
        this.member = '';
    }

    removeMember(m) {
        var index = this.newMembers.indexOf(m);
        this.newMembers.splice(index, 1);
    }

    createTeam() {
        
    }

    dismiss() {        
        this.modalController.dismiss({
            response:'dismissed'
        });
    }

}
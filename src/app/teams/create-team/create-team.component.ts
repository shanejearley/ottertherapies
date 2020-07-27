import { Component, Input } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/firestore';
import { TeamsService } from 'src/app/shared/services/teams/teams.service';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-create-team',
    templateUrl: 'create-team.component.html',
    styleUrls: ['./create-team.component.scss']
})
export class CreateTeamComponent {

    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    nameFocus: boolean;
    emailFocus: boolean;

    error: string;
    clicked: boolean = false;
    child: string;
    newMembers = [];
    member: string;
    constructor(
        public navParams: NavParams, 
        public modalController: ModalController,
        private authService: AuthService,
        private teamsService: TeamsService,
        private db: AngularFirestore,
        private router: Router
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

    onChange() {
        if (this.child && this.child.length && this.error === "Enter the child's first name") {
            this.error = null;
        }
    }

    async createTeam() {
        if (!this.child || !this.child.length) {
            this.error = "Enter the child's first name";
            this.clicked = false;
        } else {
            try {
                this.error = null;
                this.clicked = true;
                const newTeamId = this.db.createId();
                await this.teamsService.addTeam(newTeamId, this.child, this.newMembers);
                await this.router.navigate(['/Teams', newTeamId]);
                return this.dismiss();
            } catch (err) {
                this.error = err.message;
                this.clicked = false;
            }
        }
    }

    dismiss() {        
        this.modalController.dismiss({
            response:'dismissed'
        });
    }

}
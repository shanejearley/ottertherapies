import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

import { Observable, Subject } from 'rxjs';
import { tap, takeUntil, map, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../../auth/shared/services/auth/auth.service'
import { Team, TeamsService } from 'src/app/shared/services/teams/teams.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-edit-child',
    templateUrl: 'edit-child.component.html',
    styleUrls: ['./edit-child.component.scss']
})
export class EditChildComponent {
    confirm = {
        isChecked: false
    }
    teamId: string;
    team: any;
    currentTeam: Team;
    team$: Observable<Team>;
    error: boolean;

    private readonly onDestroy = new Subject<void>();

    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private authService: AuthService,
        private teamsService: TeamsService
    ) { }

    ngOnInit() {
        //
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.team$ = this.teamsService.getTeam(this.teamId);

        this.team$.pipe(
            takeUntil(this.onDestroy),
            map((team: Team) => {
                this.team = {
                    child: team.child,
                    bio: team.bio,
                };
                if (!this.currentTeam) {
                    this.currentTeam = team;
                }
            })
        ).subscribe()
    }

    async updateTeamInfo() {
        if (this.team.child) {
            this.error = false;
            if (this.team.child !== this.currentTeam.child || this.team.bio !== this.currentTeam.bio) {
                console.log('updating...');
                if (this.team.child !== this.currentTeam.child) {
                    this.team.name = this.team.child + "'s Care Team";
                    this.team.publicId = this.team.child + "-" + this.team.id.slice(-4);
                }
                await this.teamsService.updateTeamInfo(this.team);
                await this.modalController.dismiss({
                    response: 'success'
                })
            } else {
                console.log('no update necessary');
                await this.modalController.dismiss({
                    response: 'success'
                })
            }
        } else {
            this.error = true;
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

    ngOnDestroy() {
        this.onDestroy.next();
    }

}
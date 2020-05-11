import { Injectable } from '@angular/core';

import { Badge } from '@ionic-native/badge/ngx';

import { Store } from 'src/store';

import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Team } from '../teams/teams.service';
import { ProfileService } from 'src/auth/shared/services/profile/profile.service';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Platform } from '@ionic/angular';

@Injectable()
export class BadgeService {
    newValue: number;
    oldValue: number;
    teams$ = this.store.select<Team[]>('teams');
    subscription: Subscription;
    badge$ = this.teams$
        .pipe(
            tap(next => {
                if (!next) {
                    return;
                }
                console.log('BADGE CALLED');
                this.newValue = next.reduce((total: number, team: Team) => total + team.unreadMessages + team.unreadFiles + team.unreadNotes, 0);
                if (this.newValue !== this.oldValue) {
                    console.log('BADGE UPDATED', this.newValue)
                    // this.profileService.updateBadge(this.uid, this.newValue);
                    // this.platform.ready().then(() => {
                    //     if (this.platform.is('desktop')) {
                    //         console.log('desktop')
                    //     } else if (this.platform.is('ios') || this.platform.is('android')) {
                    //         this.badge.set(this.newValue);
                    //     }
                    // });
                }
                this.oldValue = this.newValue;
                this.store.set('badge', this.newValue);
            })
        )

    constructor(
        private store: Store,
        private profileService: ProfileService,
        private authService: AuthService,
        private badge: Badge,
        private platform: Platform
    ) { }

    get uid() {
        return this.authService.user.uid;
    }

}
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../shared/services/auth/auth.service';
import { Router } from '@angular/router';

import { Plugins } from '@capacitor/core';
import { Observable, Subject } from 'rxjs';
import { Store } from 'src/store';
import { takeUntil, tap } from 'rxjs/operators';
const { Browser } = Plugins;

@Component({
    selector: 'app-verify',
    styleUrls: ['verify.component.scss'],
    templateUrl: 'verify.component.html'
})
export class VerifyComponent implements OnInit {
    dark$: Observable<boolean>;
    dark: boolean;

    private readonly onDestroy = new Subject<void>();

    error: boolean = false;
    verified: boolean = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private store: Store
    ) { }

    ngOnInit() {
        this.error = false;
        this.dark$ = this.store.select('dark');
        this.dark$.pipe(
          takeUntil(this.onDestroy),
          tap(dark => {
            this.dark = dark;
          })
        ).subscribe();
    }

    async showPrivacy() {
        await Browser.open({ url: 'https://ottertherapies.com/privacy-and-terms' });
    }

    async continue() {
        try {
            await this.authService.reloadUser();
            if (this.authService.user.emailVerified) {
                console.log('verified');
                this.router.navigate(['/'])
            } else {
                console.log('not verified yet');
                this.error = true;
            }
        } catch (err) {
            this.error = true;
        }
    }

    resendVerification() {
        return this.authService.resendVerification();
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
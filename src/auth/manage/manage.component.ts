import { Component, OnInit } from '@angular/core';
import { AuthService } from '../shared/services/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

import { Plugins } from '@capacitor/core';
import { Observable, Subject } from 'rxjs';
import { Store } from 'src/store';
import { takeUntil, tap } from 'rxjs/operators';
import { Platform, ToastController } from '@ionic/angular';
const { Browser } = Plugins;

@Component({
    selector: 'app-manage',
    styleUrls: ['manage.component.scss'],
    templateUrl: 'manage.component.html'
})
export class ManageComponent implements OnInit {
    desktop: boolean;
    ios: boolean;
    android: boolean;

    mode: string;
    actionCode: string;
    email: string;
    newPassword: string;

    dark$: Observable<boolean>;
    dark: boolean;

    private readonly onDestroy = new Subject<void>();

    error: string;
    verified: boolean = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private store: Store,
        private platform: Platform,
        private toastController: ToastController
    ) { }

    ngOnInit() {
        this.platform.ready().then(() => {
            this.desktop = this.platform.is('desktop');
            this.ios = this.platform.is('ios') && this.platform.is('capacitor');
            this.android = this.platform.is('android') && this.platform.is('capacitor');
            console.log(this.desktop, this.ios, this.android)
        })

        this.activatedRoute.queryParams
            .pipe(takeUntil(this.onDestroy))
            .subscribe(async params => {
                if (!params) this.router.navigate(['/']);
                this.mode = params['mode'];
                this.actionCode = params['oobCode'];
                if (this.mode === 'verifyEmail') {
                    await this.authService.userAuth.applyActionCode(this.actionCode);
                }
                if (this.mode === 'resetPassword') {
                    this.email = await this.authService.userAuth.verifyPasswordResetCode(this.actionCode);
                }
                //resetPassword, recoverEmail, or verifyEmail
            })

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

    async presentResetToast() {
        const toast = await this.toastController.create({
          message: 'Your password was reset! Now login!',
          duration: 2000
        });
        toast.present();
    }

    async resetPassword() {
        if (!this.newPassword || !this.newPassword.length) {
            this.error = 'Try a different password';
        } else {
            this.error = null;
            try {
                await this.authService.userAuth.confirmPasswordReset(this.actionCode, this.newPassword);
                this.presentResetToast();
                setTimeout(() => {
                    this.router.navigate(['/']);
                }, 2000)
                
            } catch (err) {
                this.error = err.message;
            }
        }
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../shared/services/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

import { Plugins } from '@capacitor/core';
import { Observable, Subject } from 'rxjs';
import { Store } from 'src/store';
import { takeUntil, tap, filter } from 'rxjs/operators';
import { Platform, ToastController } from '@ionic/angular';
import { ProfileService } from '../shared/services/profile/profile.service';
const { Browser } = Plugins;

@Component({
    selector: 'app-manage',
    styleUrls: ['manage.component.scss'],
    templateUrl: 'manage.component.html'
})
export class ManageComponent implements OnInit {

    emailFocus: boolean = false;
    passwordFocus: boolean = false;
    showPassword: boolean = false;

    desktop: boolean;
    ios: boolean;
    android: boolean;

    mode: string;
    actionCode: string;
    code: string;
    email: string;
    newPassword: string;

    dark$: Observable<boolean>;
    dark: boolean;

    private readonly onDestroy = new Subject<void>();

    error: string;
    passwordError: string;
    verified: boolean = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private store: Store,
        private platform: Platform,
        private toastController: ToastController,
        private profileService: ProfileService,
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
                    try {
                        await this.authService.userAuth.applyActionCode(this.actionCode);
                        if (this.ios || this.android) {
                            setTimeout(() => {
                                this.router.navigate(['/'])
                            }, 2000)
                        }
                    } catch (err) {
                        console.log(err.message);
                        this.error = err.message;
                        if (this.ios || this.android) {
                            setTimeout(() => {
                                this.router.navigate(['/'])
                            }, 2000)
                        }
                    }

                }
                if (this.mode === 'resetPassword') {
                    try {
                        this.email = await this.authService.userAuth.verifyPasswordResetCode(this.actionCode);
                    } catch (err) {
                        console.log(err.message);
                        this.error = err.message;
                        if (this.ios || this.android) {
                            setTimeout(() => {
                                this.router.navigate(['/'])
                            }, 2000)
                        }
                    }
                } 
                else if (params) {
                    console.log(params);
                    const code = params['code'];
                    this.code = code;
                    console.log(code);
                    this.authService.saveGoogle(code)
                        .pipe(
                            takeUntil(this.onDestroy),
                            filter(Boolean),
                            tap((data: any) => {
                                console.log(data)
                                if (data.response === 'success') {
                                    this.profileService.turnSyncOn();
                                    if (this.ios || this.android) {
                                        setTimeout(() => {
                                            this.router.navigate(['/Profile'])
                                        }, 2000)
                                    }
                                } else if (data.response === 'fail') {
                                    this.profileService.turnSyncOff();
                                    this.error = 'There was an error linking your account';
                                    if (this.ios || this.android) {
                                        setTimeout(() => {
                                            this.router.navigate(['/Profile'])
                                        }, 2000)
                                    }
                                }
                            })
                        ).subscribe();
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

    ionViewWillEnter() {
        this.showPassword = false;
    }

    async showPrivacy() {
        await Browser.open({ url: 'https://ottertherapies.com/privacy-and-terms' });
    }

    async presentResetToast() {
        const toast = await this.toastController.create({
          message: 'Your password was reset! Now log in!',
          duration: 2000
        });
        toast.present();
    }

    async resetPassword() {
        if (!this.newPassword || !this.newPassword.length) {
            this.passwordError = 'Try a different password';
        } else {
            this.passwordError = null;
            try {
                await this.authService.userAuth.confirmPasswordReset(this.actionCode, this.newPassword);
                this.presentResetToast();
                setTimeout(() => {
                    this.router.navigate(['/'])
                }, 2000)
                
            } catch (err) {
                this.passwordError = err.message;
            }
        }
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
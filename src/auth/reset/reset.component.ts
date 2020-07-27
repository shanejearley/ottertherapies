import { Component, OnInit } from '@angular/core';
import { AuthService } from '../shared/services/auth/auth.service';
import { Router } from '@angular/router';

import { Plugins } from '@capacitor/core';
import { Observable, Subject } from 'rxjs';
import { Store } from 'src/store';
import { takeUntil, tap } from 'rxjs/operators';
import { Platform, ToastController } from '@ionic/angular';
const { Browser } = Plugins;

@Component({
    selector: 'app-reset',
    styleUrls: ['reset.component.scss'],
    templateUrl: 'reset.component.html'
})
export class ResetComponent implements OnInit {

    emailFocus: boolean = false;

    desktop: boolean;
    ios: boolean;
    android: boolean;

    dark$: Observable<boolean>;
    dark: boolean;

    email: string;
    success: boolean;

    private readonly onDestroy = new Subject<void>();

    error: string;
    verified: boolean = false;

    constructor(
        private authService: AuthService,
        private router: Router,
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
          message: 'We sent you a reset email!',
          duration: 2000
        });
        toast.present();
    }

    async sendResetEmail() {
        if (!this.email || !this.email.length) {
            this.error = 'Please enter your email';
        } else {
            try {
                await this.authService.userAuth.sendPasswordResetEmail(this.email);
                this.presentResetToast();
                this.success = true;
            } catch (err) {
                this.error = err.message;
                return console.log(err.message);
            }
        }
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
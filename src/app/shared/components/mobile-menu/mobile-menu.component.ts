import { Component, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { NavParams, PopoverController, Platform } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Router } from '@angular/router';
import { Store } from 'src/store';
import { Observable, Subject } from 'rxjs';
import { tap, takeUntil, map } from 'rxjs/operators';
import { DarkService } from '../../services/dark/dark.service';
const { Browser } = Plugins;

@Component({
    selector: 'app-mobile-menu',
    templateUrl: 'mobile-menu.component.html',
    styleUrls: ['./mobile-menu.component.scss']
})
export class MobileMenuComponent {
    @ViewChild('darkToggle', { read: ElementRef, static: false }) darkToggle: ElementRef;

    dark$: Observable<boolean>;
    dark: boolean;
    otherdark: boolean;
    root: string;

    desktop: boolean;
    ios: boolean;
    android: boolean;

    private readonly onDestroy = new Subject<void>();

    constructor(
        private navParams: NavParams,
        private popoverController: PopoverController,
        private authService: AuthService,
        private router: Router,
        private darkService: DarkService,
        private platform: Platform,
        private store: Store
    ) { }

    ngOnInit() {
        //
    }

    ionViewWillEnter() {

        if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') { console.log('🎉 Dark mode is supported'); }
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

        // Listen for changes to the prefers-color-scheme media query
        prefersDark.addListener(async (mediaQuery) => {

            console.log('toggle auto');
            this.dark = mediaQuery.matches;

            setTimeout(() => {
                this.darkToggle.nativeElement.click();
            }, 250)

        });

        this.platform.ready().then(() => {
            this.desktop = this.platform.is('desktop');
            this.ios = this.platform.is('ios') && this.platform.is('capacitor');
            this.android = this.platform.is('android') && this.platform.is('capacitor');
            console.log(this.desktop, this.ios, this.android)
        })
        this.root = this.navParams.get('root');

        this.dark$ = this.store.select('dark');
        this.watchDark();

    }

    watchDark() {
        this.darkService.dark$.pipe(takeUntil(this.onDestroy), map(dark => this.dark = dark)).subscribe();
    }

    dismiss() {
        this.popoverController.dismiss({
            response: 'success'
        });
    }

    goToProfile() {
        this.router.navigate(['/Profile']);
        this.dismiss();
    }

    clickToggle() {
        this.darkToggler();
    }

    async darkToggler() {
        return this.darkService.toggle(this.dark);
    }

    async showPrivacy() {
        await Browser.open({ url: 'https://ottertherapies.com/privacy-and-terms' });
        this.dismiss();
    }

    async showGuide() {
        await Browser.open({ url: 'https://ottertherapies.com/guide' });
        this.dismiss();
    }

    async onLogout() {
        await this.authService.logoutUser();
        this.dismiss();
    }

    ngOnDestroy() {
        this.onDestroy.next();
    }
}
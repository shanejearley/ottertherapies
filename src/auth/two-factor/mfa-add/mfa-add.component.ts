import { Component, AfterViewInit, OnInit } from '@angular/core';
import { NavParams, ModalController, Config, Platform } from '@ionic/angular';
import firebase from 'firebase/app';
import { cfaSignIn, cfaSignInPhoneOnCodeSent } from '@shanoinsano10/capacitor-firebase-auth';

import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-mfa-add',
    templateUrl: 'mfa-add.component.html',
    styleUrls: ['./mfa-add.component.scss']
})
export class MfaAddComponent implements OnInit, AfterViewInit {
    uid: string;
    user: firebase.User;

    codeFocus: boolean = false;

    recaptchaVerifier: any;
    appVerifier: any;
    verified: boolean = false;
    userPhone: string = '';
    phoneMask: string = '(000) 000-0000';
    resolver: any;
    email: string = '';
    password: string = '';
    code: string = "";
    error: boolean = false;
    ios: boolean;
    android: boolean;
    desktop: boolean;
    verificationId: string = '';
    codeNumber: string = '000000'
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private authService: AuthService,
        private router: Router,
        private platform: Platform
    ) { }

    async ngOnInit() {
        this.user = (await this.authService.user);
        this.uid = (await this.authService.user).uid;
    }

    ngAfterViewInit() {
        this.platform.ready().then(() => {
            this.desktop = this.platform.is('desktop');
            this.ios = this.platform.is('ios') && this.platform.is('capacitor');
            this.android = this.platform.is('android') && this.platform.is('capacitor');
            console.log(this.desktop, this.ios, this.android)
        })

        if (!this.ios) {
            this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-button', {
                'size': 'invisible',
                'callback': (response) => {
                    if (response) {
                        this.verified = true;
                        this.checkCode(null);
                    }
                }
            });
        }
    }

    async ionViewWillEnter() {
        this.userPhone = this.navParams.get('userPhone');
        this.email = this.navParams.get('email');
        this.password = this.navParams.get('password');

        var phoneInfoOptions = {
            phoneNumber: this.userPhone,
            session: null
        };

        var iosPhoneInfoOptions = {
            phone: this.userPhone + ' ' + this.email + ' ' + this.password,
        };

        if (!this.ios) {

            await this.user.multiFactor.getSession().then((multiFactorSession) => {
                phoneInfoOptions.session = multiFactorSession;
                var phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
                return phoneAuthProvider.verifyPhoneNumber(
                    phoneInfoOptions, this.recaptchaVerifier)
                    .then(async (verificationId) => {
                        this.verificationId = verificationId;
                    });
            })

        } else {
            try {
                cfaSignInPhoneOnCodeSent().subscribe(
                    (verificationId) => {
                        this.verificationId = verificationId;
                        console.log('Got verificationId', verificationId)
                    },
                    (error) => {
                        console.log(error);
                    },
                    () => {console.log("Code verify complete was called")}
                )
                cfaSignIn('phone', iosPhoneInfoOptions).subscribe(
                    (user) => console.log('Sent a verification to ', user),
                    (error) => {
                        console.log(error);
                    },
                    () => {console.log("Send SMS code complete was called")}
                )
                ///var phoneAuthProvider =      
            } catch (err) {
                console.log(err.message);
            }
        }

    }

    async checkCode(ev) {
        if (ev) {
            this.code = ev.detail.value;
        } else {
            this.code = this.code || '';
        }
        if (this.code.length === 6 && this.verified || this.code.length === 6 && this.ios) {
            try {
                const mfaDisplayName = "2FA Mobile Device 1"
                var cred = firebase.auth.PhoneAuthProvider.credential(
                    this.verificationId, this.code);
                var multiFactorAssertion =
                    firebase.auth.PhoneMultiFactorGenerator.assertion(cred);
                await this.user.multiFactor.enroll(multiFactorAssertion, mfaDisplayName);
                this.authService.auth$.subscribe();
                return this.addSuccess();
            } catch (err) {
                this.error = err.message;
                this.addFailure();
            }
        } else if (this.code.length === 6 && !this.verified && !this.ios) {
            console.log("Verify you are not a robot!")
        } else if (this.code.length !== 6) {
            console.log("Enter your code!");
        } else {
            console.log("Verify you are not a robot and enter your code!");
        }
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    addFailure() {
        return this.modalController.dismiss({
            response: this.error
        })
    }

    addSuccess() {
        return this.modalController.dismiss({
            response: 'success'
        });
    }

}
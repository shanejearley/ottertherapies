import { Component, Input } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser'
import { NavParams, ModalController } from '@ionic/angular';

@Component({
    selector: 'app-scan',
    templateUrl: 'scan.component.html'
})
export class ScanComponent {
    photo: SafeResourceUrl;
    constructor(public navParams: NavParams, public modalController: ModalController) {}
    ionViewWillEnter() {
        this.photo = this.navParams.get('photo');
    }

    dismiss() {        
        this.modalController.dismiss({
            response:'dismissed'
        });
    }

    upload() {
        this.modalController.dismiss({
            response:'upload'
        });
    }

    retake() {
        this.modalController.dismiss({
            response:'retake'
        })
    }
}
import { Component, Input } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser'
import { NavParams, ModalController } from '@ionic/angular';

@Component({
    selector: 'app-upload',
    templateUrl: 'upload.component.html'
})
export class UploadComponent {
    photo: SafeResourceUrl;
    photoName: string;
    constructor(public navParams: NavParams, public modalController: ModalController) {}
    ionViewWillEnter() {
        this.photo = this.navParams.get('photo');
        this.photoName = this.navParams.get('photoName');
    }

    uploadScan() {
        // //file interface reminder
        // id: string,
        // name: string,
        // size: number,
        // timestamp: firestore.FieldValue,
        // type: string,
        // uid: string,
        // url: string,
        // profile: Profile
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
}
import { Component } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

@Component({
    selector: 'app-enlarge-thumbnail',
    templateUrl: 'enlarge-thumbnail.component.html',
    styleUrls: ['./enlarge-thumbnail.component.scss']
})
export class EnlargeThumbnailComponent {
    images: any;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController
    ) { }

    ngOnInit() {
        //
    }

    ionViewWillEnter() {
        this.images = this.navParams.get('images');
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }
}
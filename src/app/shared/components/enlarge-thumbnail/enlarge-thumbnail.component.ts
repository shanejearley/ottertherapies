import { Component } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';

@Component({
    selector: 'app-enlarge-thumbnail',
    templateUrl: 'enlarge-thumbnail.component.html',
    styleUrls: ['./enlarge-thumbnail.component.scss']
})
export class EnlargeThumbnailComponent {
    image: any;
    constructor(
        public navParams: NavParams,
        public popoverController: PopoverController
    ) { }

    ngOnInit() {
        //
    }

    ionViewWillEnter() {
        this.image = this.navParams.get('image');
    }

    dismiss() {
        this.popoverController.dismiss({
            response: 'dismissed'
        });
    }
}
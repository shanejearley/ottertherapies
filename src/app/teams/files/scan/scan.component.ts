import { Component, ViewChild, ElementRef } from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser'
import { NavParams, ModalController, IonSlides } from '@ionic/angular';
import { Store } from 'src/store';
import { Profile } from 'src/auth/shared/services/profile/profile.service';
import { Group } from 'src/app/shared/services/groups/groups.service';
import { Member } from 'src/app/shared/services/members/members.service';
import { Observable } from 'rxjs';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';

import { DocumentScanner, DocumentScannerOptions } from '@ionic-native/document-scanner/ngx';

import { tap } from 'rxjs/operators';

import * as jsPDF from 'jspdf';

export class Scan {
    imgs: String[];
    pdf: any;
    sanitizedPdf: SafeResourceUrl;
    file: File;
}

@Component({
    selector: 'app-scan',
    templateUrl: 'scan.component.html',
    styleUrls: ['./scan.component.scss']
})
export class ScanComponent {
    uid: string;
    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    index: number = 0;

    sourceId: string;
    error: string;
    scans: Scan[] = [];
    folder;
    pdfData: File;
    profile$: Observable<Profile>;
    groups$: Observable<Group[]>;
    members$: Observable<Member[]>;
    teamId: string;
    photo: SafeResourceUrl;

    currentScan: Scan;
    pipelineCanvas: HTMLCanvasElement;
    pipelineContext: CanvasRenderingContext2D;
    pipeline: boolean;

    selectedFilter: string = 'contrast';
    image: any = '';
    brightness: any = '';
    imageResult: HTMLElement;
    brightnessResult: HTMLElement;


    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private documentScanner: DocumentScanner,
        private sanitizer: DomSanitizer
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;
        this.profile$ = this.store.select<Profile>('profile');
        this.groups$ = this.store.select<Group[]>('groups');
        this.members$ = this.store.select<Member[]>('members');
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.folder = this.navParams.get('folder');
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    async newPage(scan) {
        console.log('got scan!', scan.file.name);
        this.currentScan = scan;
        this.addScan();
    }

    async newScan() {
        this.addScan();
    }

    async addScan() {
        //take photo
        this.photo = await this.scanCapture();
        this.image = 'data:image/jpg;base64,' + this.photo;
        this.pipeline = true;
    }

    async imageLoaded(e) {
        console.log('image loaded!');
        // Grab a reference to the canvas/image
        let base64 = '';
        this.imageResult = e.detail.result;
        let canvas = this.imageResult as HTMLCanvasElement;
        // export as dataUrl or Blob!
        base64 = canvas.toDataURL('image/jpeg', 1.0);
        this.brightness = base64;
        this.image = null;
        this.imageResult = null;

    }

    async brightnessLoaded(e) {

        // Grab a reference to the canvas/image
        let base64 = '';
        this.brightnessResult = e.detail.result;
        let canvas = this.brightnessResult as HTMLCanvasElement;
        // export as dataUrl or Blob!
        base64 = canvas.toDataURL('image/jpeg', 1.0);
        if (this.currentScan) {
            this.addScanPage(base64);
        } else {
            this.createNewScan(base64);
        }

        this.brightness = null;
        this.brightnessResult = null;

    }

    async scanCapture() {

        let opts: DocumentScannerOptions = {
            returnBase64: true
        };

        try {
            const res = await this.documentScanner.scanDoc(opts);
            return res;
        } catch (error) {
            this.error = error.message;
        }

    }

    async createNewScan(data: string) {

        console.log('Creating new scan!');
        const newDoc = new jsPDF();
        const width = newDoc.internal.pageSize.width;
        const height = newDoc.internal.pageSize.height;

        await newDoc.addImage(data, 'JPG', 0, 0, width, height);

        const newPdfUrl = newDoc.output('datauristring');

        const sanitizedPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(newPdfUrl);
        const name = `Scan_${Date.now()}.pdf`;
        const file = new File([newPdfUrl], name, { type: 'application/pdf' });

        const scan: Scan = {
            imgs: [ data ],
            pdf: newPdfUrl,
            sanitizedPdf: sanitizedPdfUrl,
            file: file
        }

        this.pipeline = false;
        this.scans.push(scan);
    }

    async addScanPage(data: string) {

        console.log('Adding new scan page!')
        const scanIndex = this.scans.indexOf(this.currentScan);
        console.log('Index of scan!', scanIndex);

        const newDoc = new jsPDF();
        const width = newDoc.internal.pageSize.width;
        const height = newDoc.internal.pageSize.height;

        const imgsPromise = this.currentScan.imgs.map(async (img, i) => {
            if (i !== 0) {
                await newDoc.addPage();
            }
            return newDoc.addImage(img, 'JPG', 0, 0, width, height);
        })
        await Promise.all(imgsPromise);
        
        await newDoc.addPage();
        await newDoc.addImage(data, 'JPG', 0, 0, width, height);

        const newPdfUrl = newDoc.output('datauristring');
        
        const sanitizedPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(newPdfUrl);
        const file = new File([newPdfUrl], this.currentScan.file.name, { type: 'application/pdf' });

        const updatedScan: Scan = {
            imgs: [ ...this.currentScan.imgs, data ],
            pdf: newPdfUrl,
            sanitizedPdf: sanitizedPdfUrl,
            file: file
        }

        this.scans[scanIndex] = updatedScan;
        this.currentScan = null;
        this.pipeline = false;

    }

    async removeScan(scan) {
        const index = this.scans.indexOf(scan);
        return this.scans.splice(index, 1);
    }
}
import { Component } from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser'
import { NavParams, ModalController } from '@ionic/angular';
import { Store } from 'src/store';
import { Profile } from 'src/auth/shared/services/profile/profile.service';
import { Group } from 'src/app/shared/services/groups/groups.service';
import { Member } from 'src/app/shared/services/members/members.service';
import { Observable } from 'rxjs';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';

import { DocumentScanner, DocumentScannerOptions } from '@ionic-native/document-scanner/ngx';

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { tap } from 'rxjs/operators';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

export class Scan {
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
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private store: Store,
        private authService: AuthService,
        private documentScanner: DocumentScanner,
        private sanitizer: DomSanitizer
    ) { }

    ngOnInit() {
        this.profile$ = this.store.select<Profile>('profile');
        this.groups$ = this.store.select<Group[]>('groups');
        this.members$ = this.store.select<Member[]>('members');
    }

    ionViewWillEnter() {
        this.teamId = this.navParams.get('teamId');
        this.sourceId = this.navParams.get('sourceId');
        if (this.sourceId !== 'files') {
            this.members$.pipe(tap(ms => {
                if (ms) {
                    this.folder = ms.find(m => m.uid === this.sourceId);
                }
            })).subscribe()
        }
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    reset() {
        this.scans = [];
        this.folder = null;
    }

    get uid() {
        return this.authService.user.uid;
    }

    async addScan() {
        //take photo
        const photo = await this.scanCapture();
        //convert and add object
        return this.generateScanObj(photo);
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

    generateScanObj(data: string) {
        const docDefinition = {
            pageSize: 'LETTER', //pageSize: { width: 612.00, height: 792.00},
            pageMargins: [0, 0, 0, 0],
            content: [
                {
                    image: 'data:image/jpg;base64,' + data,
                    width: 612.00,
                    height: 792.00
                }
            ]
        }
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);

        pdfDocGenerator.getBase64((base64: any) => {
            pdfDocGenerator.getDataUrl((dataUrl: any) => {
                //sanitize preview
                const sanitizedPdf = this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
                //name and create file
                const name = `Scan_${Date.now()}.pdf`;
                const file = new File([base64], name, { type: 'application/pdf' });
                if (base64 && file) {
                    //create scan object
                    const scan: Scan = {
                        pdf: base64,
                        sanitizedPdf: sanitizedPdf,
                        file: file
                    }
                    this.scans.push(scan);
                }
            });
        });
    }
}
import { Component, OnInit, Input, ChangeDetectorRef, SecurityContext, ViewChild, EventEmitter, Output } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import firebase from 'firebase/app';
import { SafeResourceUrl, DomSanitizer, SafeValue } from '@angular/platform-browser';
import { Scan } from '../scan/scan.component';
import { EnlargeThumbnailComponent } from 'src/app/shared/components/enlarge-thumbnail/enlarge-thumbnail.component';
import { ModalController, IonFab } from '@ionic/angular';

@Component({
    selector: 'app-upload-task',
    templateUrl: './upload-task.component.html',
    styleUrls: ['./upload-task.component.scss']
})
export class UploadTaskComponent implements OnInit {
    @ViewChild('uploadFab', { static: true }) fab: IonFab;

    @Input() teamId: string;
    @Input() folder;
    @Input() file: File;
    @Input() profilePicture: boolean = false;
    @Input() scan: Scan;

    finalDestination;

    @Output()
    remove = new EventEmitter();

    @Output()
    addPage = new EventEmitter();

    uid: string;

    scanPreview: SafeResourceUrl;
    task: AngularFireUploadTask;
    percentage: Observable<number>;
    snapshot: Observable<any>;
    downloadURL: string = null;
    metadata;
    fileId: string;
    filePath;
    filesRef;
    docRef;
    storageRef;
    pathId: string;

    fileName: string;
    fileExt: string;

    error: string;
    uploading: boolean;
    paused: boolean;


    constructor(
        private storage: AngularFireStorage,
        private db: AngularFirestore,
        private authService: AuthService,
        private modalController: ModalController
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;
        if (this.file.name) {
            this.fileName = this.file.name.split('.')[0];
            this.fileExt = '.' + this.file.name.split('.').pop();
        } else {
            this.fileName = `${Date.now()}_croppedImage`;
            this.fileExt = '.png';
        }
    }

    ionViewWillEnter() {
        //
    }

    taskCompleted() {
        console.log('All done!')
    }

    removeFile() {
        return this.remove.emit();
    }

    emitAddPage() {
        return this.addPage.emit();
    }

    enlargePreview() {
        this.presentModal()
    }

    async presentModal() {
        const modal = await this.modalController.create({
            component: EnlargeThumbnailComponent,
            componentProps: {
                'images': this.scan.imgs
            },
            swipeToClose: true,
            presentingElement: await this.modalController.getTop()
        });
        return await modal.present();
    }

    async onChangeName(ev) {
        if (!ev.detail.value || !ev.detail.value.length) {
            this.fileName = ev.detail.value;
            return this.error = 'You need a file name.';
        } else if (ev.detail.value && ev.detail.value.length && this.error === 'You need a file name.') {
            this.error = null;
        }
        return this.fileName = ev.detail.value;
    }

    async startUpload() {

        this.finalDestination = this.folder;

        this.uploading = true;

        console.log('uploading to ', this.folder);

        await this.authService.reloadUser();
        await this.authService.checkClaims();

        this.fileId = this.db.createId();
        if (this.teamId && this.folder && !this.folder.uid && this.folder.id) {
            this.error = null;
            this.filePath = `teams/${this.teamId}/groups/${this.folder.id}/files/${this.fileName + this.fileExt}`;
            this.filesRef = this.db.collection<File>(`teams/${this.teamId}/groups/${this.folder.id}/files`);
            this.docRef = this.db.doc<File>(`teams/${this.teamId}/groups/${this.folder.id}`);
        } else if (this.teamId && this.folder && this.folder.uid && this.folder.uid !== this.uid) {
            this.error = null;
            this.pathId = this.uid < this.folder.uid ? this.uid + this.folder.uid : this.folder.uid + this.uid;
            this.filePath = `teams/${this.teamId}/direct/${this.pathId}/files/${this.fileName + this.fileExt}`;
            this.filesRef = this.db.collection<File>(`teams/${this.teamId}/direct/${this.pathId}/files`);
            this.docRef = this.db.doc<File>(`teams/${this.teamId}/direct/${this.pathId}`);
        } else if (this.teamId && this.folder && this.folder.uid && this.folder.uid == this.uid) {
            this.error = null;
            this.filePath = `users/${this.uid}/teams/${this.teamId}/files/${this.fileName + this.fileExt}`;
            this.filesRef = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
            this.docRef = this.db.doc<File>(`users/${this.uid}/teams/${this.teamId}`);
        } else if (!this.teamId && !this.folder && this.profilePicture) {
            this.error = null;
            this.filePath = `users/${this.uid}/profile/${this.fileName + this.fileExt}`;
            this.filesRef = this.db.collection<File>(`users`);
            this.docRef = this.db.doc<File>(`users/${this.uid}`);
        } else if (this.teamId && !this.folder && this.profilePicture) {
            this.error = null;
            this.filePath = `teams/${this.teamId}/profile/${this.fileName + this.fileExt}`;
            this.filesRef = this.db.collection<File>(`teams`);
            this.docRef = this.db.doc<File>(`teams/${this.teamId}`)
        }
        this.storageRef = this.storage.ref(this.filePath);

        try {
            // The main task
            if (!this.profilePicture && !this.scan) {
                console.log('uploading to...', this.filePath)
                this.task = this.storage.upload(this.filePath, this.file);
            } else if (!this.profilePicture && this.scan) {
                console.log('uploading to...', this.filePath)
                this.task = this.storageRef.putString(this.scan.pdf, 'data_url');
                //this.task = this.storageRef.putString(this.scan.pdf, 'base64', { contentType: 'application/pdf' });
            } else if (this.profilePicture) {
                console.log('uploading to...', this.filePath)
                this.task = this.storageRef.putString(this.file, 'data_url');
            }

            // Progress monitoring
            this.percentage = this.task.percentageChanges();

            this.task.snapshotChanges().pipe(
                tap(console.log),
                // The file's download URL
                finalize(async () => {
                    this.downloadURL = await this.storageRef.getDownloadURL().toPromise();
                    this.metadata = await this.storageRef.getMetadata().toPromise();
                    if (this.profilePicture) {
                        this.docRef.set({
                            url: this.downloadURL
                        }, { merge: true })
                    } else {
                        this.filesRef.doc(this.fileId).set({
                            name: this.fileName + this.fileExt,
                            size: this.file.size ? this.file.size : this.metadata.size,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            type: this.file.type,
                            uid: this.uid,
                            url: this.downloadURL,
                            profile: null
                        })
                        this.uploading = false;
                    }

                }),
            ).subscribe()
        } catch (err) {
            return this.error = err.message;
        }
    }

}
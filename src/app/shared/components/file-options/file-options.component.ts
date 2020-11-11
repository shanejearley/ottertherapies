import { Component, OnInit } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import firebase from 'firebase/app';
import { NavParams, ModalController, Platform, ToastController } from '@ionic/angular';

import { Store } from 'src/store';
import { Profile } from 'src/auth/shared/services/profile/profile.service';

import { Plugins, FilesystemDirectory, FilesystemEncoding } from '@capacitor/core';
const { Browser, Filesystem } = Plugins;

import { CopyFileComponent } from '../copy-file/copy-file.component';

import moment from 'moment';

@Component({
    selector: 'app-file-options',
    templateUrl: './file-options.component.html',
    styleUrls: ['./file-options.component.scss']
})
export class FileOptionsComponent implements OnInit {
    uid: string;
    // choose random otter to display
    otters = ["wave", "walk", "lay", "float", "hello", "awake", "snooze"]
    random = this.otters[Math.floor(Math.random() * this.otters.length)];

    teamId: string;
    file;
    folder;
    displayName;

    task: AngularFireUploadTask;
    fileName: string = null;
    percentage: Observable<number>;
    snapshot: Observable<any>;
    downloadURL;
    metadata;

    fileId: string;
    filePath;
    filesRef;

    docRef;
    storageRef;
    pathId: string;

    date: Date;
    time: number;

    currentName: string;
    updateName: string;
    fileExt: string;
    saved: boolean;

    copyFolder;
    copyFileId: string;
    copyFile;

    error: string;

    profile$: Observable<Profile>;

    desktop: boolean;
    ios: boolean;
    android: boolean;

    data;

    constructor(
        public navParams: NavParams,
        private storage: AngularFireStorage,
        private db: AngularFirestore,
        private authService: AuthService,
        private modalController: ModalController,
        private store: Store,
        private platform: Platform,
        private toastController: ToastController
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;

        this.date = new Date();
        this.time = moment(this.date).startOf('day').toDate().getTime();

    }

    ionViewWillEnter() {
        this.platform.ready().then(() => {
            this.desktop = this.platform.is('desktop');
            this.ios = this.platform.is('ios') && this.platform.is('capacitor');
            this.android = this.platform.is('android') && this.platform.is('capacitor');
            console.log(this.desktop, this.ios, this.android)
        })
        this.profile$ = this.store.select('profile');
        this.teamId = this.navParams.get('teamId');
        this.file = this.navParams.get('file');
        this.folder = this.navParams.get('folder');
        this.displayName = this.navParams.get('displayName');
        if (this.file) {
            this.currentName = this.file.name.split('.')[0];
            this.updateName = this.file.name.split('.')[0];
            this.fileExt = '.' + this.file.name.split('.').pop();
        }
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    async copyModal(file, folder) {
        const modal = await this.modalController.create({
            component: CopyFileComponent,
            componentProps: {
                'teamId': this.teamId,
                'file': file,
                'folder': folder
            },
            swipeToClose: true,
            presentingElement: await this.modalController.getTop()
        });
        modal.onWillDismiss().then(data => {
            this.data = data.data;
            if (!this.data.response) {
                return;
            }
            if (this.data.response === 'copy') {
                this.copyFolder = this.data.folder;
                return this.presentCopyingToast();
            }
        });
        return await modal.present();
    }

    async presentCopyingToast() {
        const copyingToast = await this.toastController.create({
            message: 'Copying file...',
            position: 'bottom'
        });
        await copyingToast.present();
        try {
            await this.uploadFileCopy(this.copyFolder, this.file);
        } catch (err) {
            console.log(err);
            await copyingToast.dismiss();
            return this.presentErrorToast();
        }
        await copyingToast.dismiss();
        return this.presentCopyToast();
    }

    async presentErrorToast() {
        const copyToast = await this.toastController.create({
            message: 'An error occurred copying the file...',
            position: 'bottom',
            duration: 2000
        });
        await copyToast.present();
    }

    async presentCopyToast() {
        const copyToast = await this.toastController.create({
            message: 'File copied!',
            position: 'bottom',
            duration: 2000
        });
        await copyToast.present();
    }

    async uploadFileCopy(folder, file) {
        return new Promise(async (resolve, reject) => {
            try {
                this.copyFile = await this.duplicateFile(file);
                this.copyFileId = this.db.createId();

                await this.authService.reloadUser();
                await this.authService.checkClaims();

                if (!folder.uid) {
                    this.filePath = `teams/${this.teamId}/groups/${folder.id}/files/${this.currentName + this.fileExt}`;
                    this.filesRef = this.db.collection<File>(`teams/${this.teamId}/groups/${folder.id}/files`);
                    this.docRef = this.db.doc<File>(`teams/${this.teamId}/groups/${folder.id}`);
                } else if (folder.uid !== this.uid) {
                    this.pathId = this.uid < folder.uid ? this.uid + folder.uid : folder.uid + this.uid;
                    this.filePath = `teams/${this.teamId}/direct/${this.pathId}/files/${this.currentName + this.fileExt}`;
                    this.filesRef = this.db.collection<File>(`teams/${this.teamId}/direct/${this.pathId}/files`);
                    this.docRef = this.db.doc<File>(`teams/${this.teamId}/direct/${this.pathId}`);
                } else {
                    this.filePath = `users/${this.uid}/teams/${this.teamId}/files/${this.currentName + this.fileExt}`;
                    this.filesRef = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
                    this.docRef = this.db.doc<File>(`users/${this.uid}/teams/${this.teamId}`);
                }

                this.storageRef = this.storage.ref(this.filePath);
                this.task = this.storage.upload(this.filePath, this.copyFile);
                // Progress monitoring
                this.percentage = this.task.percentageChanges();
                this.task.snapshotChanges().pipe(
                    tap(console.log),
                    // The file's download URL
                    finalize(async () => {
                        this.downloadURL = await this.storageRef.getDownloadURL().toPromise();
                        this.metadata = await this.storageRef.getMetadata().toPromise();
                        await this.filesRef.doc(this.copyFileId).set({
                            name: this.currentName + this.fileExt,
                            size: this.metadata.size,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            type: this.file.type,
                            uid: this.uid,
                            url: this.downloadURL
                        })
                        resolve();
                    }),
                ).subscribe()
            } catch (err) {
                reject(new DOMException(err.message));
            }
        })
    }

    async onChangeName(ev) {
        if (!ev.detail.value || !ev.detail.value.length) {
            this.updateName = ev.detail.value;
            return this.error = 'You need a file name.';
        } else if (ev.detail.value && ev.detail.value.length && this.error === 'You need a file name.') {
            this.error = null;
        }
        this.updateName = ev.detail.value;
        if (this.updateName !== this.currentName) {
            this.saved = false;
        } else {
            this.saved = null;
        }
    }

    async updateFilename() {
        if (this.updateName === this.currentName) {
            this.saved = true;
            return console.log('no update necessary');
        } else if (!this.folder.uid) {
            console.log('update group file');
            await this.db.collection('teams').doc(this.teamId).collection('groups').doc(this.folder.id).collection('files').doc(this.file.id).update({
                name: this.updateName + this.fileExt
            });
            this.currentName = this.updateName;
            return this.saved = true;
            //update storage filename in cloud functions
        } else if (this.folder.uid !== this.uid) {
            const pathId = this.uid < this.folder.uid ? this.uid + this.folder.uid : this.folder.uid + this.uid;
            console.log('update member file');
            await this.db.collection('teams').doc(this.teamId).collection('direct').doc(pathId).collection('files').doc(this.file.id).update({
                name: this.updateName + this.fileExt
            });
            this.currentName = this.updateName;
            return this.saved = true;
            //update storage filename in cloud functions
        } else {
            console.log('update private file');
            await this.db.collection('users').doc(this.uid).collection('teams').doc(this.teamId).collection('files').doc(this.file.id).update({
                name: this.updateName + this.fileExt
            });
            this.currentName = this.updateName;
            return this.saved = true;
            //update storage filename in cloud functions
        }
    }

    async previewFile() {
        await Browser.open({ url: this.file.url });
    }

    async duplicateFile(file) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        xhr.open('GET', file.url);
        xhr.send();
        return new Promise((resolve, reject) => {
            xhr.onerror = () => {
                reject(new DOMException("Problem duplicating file."));
            }
            xhr.onload = (event) => {
                var blob = xhr.response;
                resolve(blob);
            };
        })
    }

    async fileRead(file) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            console.log(file);
            reader.readAsDataURL(file);
            reader.onerror = () => {
                reader.abort();
                reject(new DOMException("Problem parsing input file."))
            }
            reader.onloadend = () => {
                const result: string = reader.result.toString();
                resolve(result);
            };
        })
    }

    async fileWrite(data) {
        try {
            const result = await Filesystem.writeFile({
                path: this.file.name,
                data: data,
                directory: FilesystemDirectory.Documents,
                encoding: FilesystemEncoding.UTF8
            })
            return result.uri;
        } catch (e) {
            console.error('Unable to write file', e);
        }
    }

    async fileDataDownload() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.onload = async (event) => {
                const blob = xhr.response;
                const fileUrl = await this.fileRead(blob);
                const base64Data = fileUrl.toString().split(',').pop();

                resolve(base64Data);
            };
            xhr.open('GET', this.file.url);
            xhr.send();

        })
    }

    async fileDelete() {
        await Filesystem.deleteFile({
            path: this.file.name,
            directory: FilesystemDirectory.Documents
        });
    }

    async downloadFile() {
        const base64Data = await this.fileDataDownload();
        return Plugins.FileSharer.share({
            filename: this.currentName + this.fileExt,
            base64Data: base64Data,
            contentType: this.file.type,
        })
    }

    async deleteFile() {
        console.log('deleting');
        return this.modalController.dismiss({ response: 'delete' })
    }

}
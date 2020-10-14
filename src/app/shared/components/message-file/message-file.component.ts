import { Component, OnInit, Input, ChangeDetectorRef, SecurityContext, Output, EventEmitter, OnChanges } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { firestore } from 'firebase/app';
import { SafeResourceUrl, DomSanitizer, SafeValue } from '@angular/platform-browser';
import { EnlargeThumbnailComponent } from 'src/app/shared/components/enlarge-thumbnail/enlarge-thumbnail.component';
import { PopoverController } from '@ionic/angular';
import { MembersService } from '../../services/members/members.service';
import { GroupsService } from '../../services/groups/groups.service';

@Component({
    selector: 'app-message-file',
    templateUrl: './message-file.component.html',
    styleUrls: ['./message-file.component.scss']
})
export class MessageFileComponent {

    @Input() teamId: string;
    @Input() directId: string;
    @Input() groupId: string;
    @Input() file;

    uid: string;

    scanPreview: SafeResourceUrl;
    task: AngularFireUploadTask;
    fileName: string = null;
    percentage: Observable<number>;
    snapshot: Observable<any>;
    downloadURL;
    metadata;

    fileId: string;
    filePath;
    filesRef;

    fileExt;

    docRef;
    storageRef;
    pathId: string;

    @Output()
    remove = new EventEmitter();

    constructor(
        private storage: AngularFireStorage,
        private db: AngularFirestore,
        private authService: AuthService,
        private groupsService: GroupsService,
        private membersService: MembersService
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;
    }

    ionViewWillEnter() {
        //
    }

    removeFile(file) {
        return this.remove.emit(file);
    }

    public async upload() {

        return new Promise(async (resolve, reject) => {

            try {
                await this.authService.reloadUser();
                await this.authService.checkClaims();
    
                this.fileId = this.db.createId();
                if (!this.file.name) {
                    this.fileExt = this.file.type === 'image/png' ? '.png' : this.file.type === 'image/jpeg' ? '.jpeg' : this.file.type === 'image/jpg' ? '.jpg' : this.file.type === 'image/gif' ? '.gif' : null;
                    this.file.name = `Messages_${this.fileId.slice(-4)}_${Date.now() + this.fileExt}`
                }

                if (this.teamId && this.groupId) {
                    this.filePath = `teams/${this.teamId}/groups/${this.groupId}/files/${this.file.name}`;
                    this.filesRef = this.db.collection<File>(`teams/${this.teamId}/groups/${this.groupId}/files`);
                    this.docRef = this.db.doc<File>(`teams/${this.teamId}/groups/${this.groupId}`);
                } else if (this.teamId && this.directId !== this.uid) {
                    this.pathId = this.uid < this.directId ? this.uid + this.directId : this.directId + this.uid;
                    this.filePath = `teams/${this.teamId}/direct/${this.pathId}/files/${this.file.name}`;
                    this.filesRef = this.db.collection<File>(`teams/${this.teamId}/direct/${this.pathId}/files`);
                    this.docRef = this.db.doc<File>(`teams/${this.teamId}/direct/${this.pathId}`);
                } else if (this.teamId && this.directId == this.uid) {
                    this.filePath = `users/${this.uid}/teams/${this.teamId}/files/${this.file.name}`;
                    this.filesRef = this.db.collection<File>(`users/${this.uid}/teams/${this.teamId}/files`);
                    this.docRef = this.db.doc<File>(`users/${this.uid}/teams/${this.teamId}`);
                }
    
                this.storageRef = this.storage.ref(this.filePath);
    
                // The main task
                this.task = this.storageRef.putString(this.file.value, 'data_url');
    
                // Progress monitoring
                this.percentage = this.task.percentageChanges();
    
                this.snapshot = this.task.snapshotChanges().pipe(
                    tap(console.log),
                    // The file's download URL
                    finalize(async () => {
                        this.downloadURL = await this.storageRef.getDownloadURL().toPromise();
                        this.metadata = await this.storageRef.getMetadata().toPromise();
    
                        await this.filesRef.doc(this.fileId).set({
                            name: this.file.name,
                            size: this.metadata.size,
                            timestamp: firestore.FieldValue.serverTimestamp(),
                            type: this.file.type,
                            uid: this.uid,
                            url: this.downloadURL,
                            profile: null
                        })

                        this.file.style = this.file.type === 'image/png' || this.file.type === 'image/jpeg' || this.file.type === 'image/jpg' || this.file.type === 'image/gif' ? 'image' : 'file';

                        if (this.groupId) {
                            await this.groupsService.addMessage(this.downloadURL, this.groupId, this.file.style, this.file.name);
                            resolve("Uploaded and sent message file."); 
                        } else if (this.directId) {
                            await this.membersService.addMessage(this.downloadURL, this.directId, this.file.style, this.file.name);
                            resolve("Uploaded and sent message file.");
                        }
    
                    }),
                );
            } catch (err) {
                reject(new DOMException(err.message));
            }

        })
    }

    isActive(snapshot) {
        return snapshot.state === 'running' && snapshot.bytesTransferred < snapshot.totalBytes;
    }

}
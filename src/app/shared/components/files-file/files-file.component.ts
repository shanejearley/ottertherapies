import { Component, OnInit, Input, ChangeDetectorRef, SecurityContext, Output, EventEmitter, OnChanges } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import firebase from 'firebase/app';
import { SafeResourceUrl, DomSanitizer, SafeValue } from '@angular/platform-browser';
import { EnlargeThumbnailComponent } from 'src/app/shared/components/enlarge-thumbnail/enlarge-thumbnail.component';
import { PopoverController } from '@ionic/angular';
import { MembersService } from '../../services/members/members.service';
import { GroupsService } from '../../services/groups/groups.service';

import moment from 'moment';

@Component({
    selector: 'app-files-file',
    templateUrl: './files-file.component.html',
    styleUrls: ['./files-file.component.scss']
})
export class FilesFileComponent implements OnInit {

    @Input() teamId: string;
    @Input() file;
    @Input() displayName;
    @Input() member;
    @Input() profile;

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

    date: Date;
    time: number;

    @Output()
    options = new EventEmitter();

    constructor(
        private storage: AngularFireStorage,
        private db: AngularFirestore,
        private authService: AuthService,
        private groupsService: GroupsService,
        private membersService: MembersService
    ) { }

    async ngOnInit() {
        this.uid = (await this.authService.user).uid;

        this.date = new Date();
        this.time = moment(this.date).startOf('day').toDate().getTime();
    }

    ionViewWillEnter() {
        //
    }

    fileOptions(file) {
        return this.options.emit(file);
    }

}
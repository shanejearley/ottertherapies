import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Platform, ModalController } from '@ionic/angular';
import { Plugins, FilesystemDirectory, FilesystemEncoding } from '@capacitor/core';
const { Filesystem } = Plugins;

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { v4 as uuidv4 } from 'uuid';

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';
import { MembersService, Member } from '../../shared/services/members/members.service';
import { ScanComponent } from './scan/scan.component';
import { UploadComponent } from './upload/upload.component';

import { Store } from 'src/store';

import { DocumentScanner, DocumentScannerOptions } from '@ionic-native/document-scanner/ngx';
import { DocumentViewer, DocumentViewerOptions } from '@ionic-native/document-viewer/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { File } from '@ionic-native/file/ngx';

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-files',
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.scss'],
})
export class FilesComponent implements OnInit {
  photoName: string;
  photo: SafeResourceUrl;
  teamId: string;
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  members$: Observable<Member[]>;
  subscriptions: Subscription[] = [];
  getProfileSub: Subscription;
  public team: string;
  public page: string;
  public data: any;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    private documentScanner: DocumentScanner,
    private documentViewer: DocumentViewer,
    private photoViewer: PhotoViewer,
    private file: File,
    private modalController: ModalController,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.members$ = this.store.select<Member[]>('members');
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(
        tap(param => { this.teamId = param.id }),
        switchMap(param => this.teamsService.getTeam(param.id))
      );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async readFilePath(path) {
    // Here's an example of reading a file with a full file path. Use this to
    // read binary data (base64 encoded) from plugins that return File URIs, such as
    // the Camera.
    try {
      if (Filesystem.readFile) {
        Filesystem.readFile({
          path: path
        }).then((data) => {
          if (data) {
            this.photoName = 'Scan-'+uuidv4().substr(0,5);
            this.photo = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,'+data.data);
            this.scanModal();
          }
        })
      }
    } catch(err) {
      console.log(err.message);
    }
  }

  scanDoc() {
    let opts: DocumentScannerOptions = {};
    this.documentScanner.scanDoc(opts)
      .then((res: string) => {
        console.log(res);
        this.readFilePath(res);
      })
      .catch((error: any) => console.error(error));
  }

  async scanModal() {
    const modal = await this.modalController.create({
      component: ScanComponent,
      componentProps: {
        'photo': this.photo
      }
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'upload') {
        this.uploadModal();
      }
      if (this.data.response == 'retake') {
        this.scanDoc();
      }
    });
    return await modal.present();
  }

  async uploadModal() {
    const modal = await this.modalController.create({
      component: UploadComponent,
      componentProps: {
        'photo': this.photo,
        'photoName': this.photoName
      }
    });
    modal.onWillDismiss().then(data => {
      this.data = data.data;
      if (this.data.response == 'upload') {
        console.log('upload task here...')
      }
      if (this.data.response == 'retake') {
        this.scanDoc();
      }
    });
    return await modal.present();
  }

}

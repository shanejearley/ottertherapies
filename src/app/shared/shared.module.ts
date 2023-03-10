import { NgModule, ModuleWithProviders, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Badge } from '@ionic-native/badge/ngx';

// services
import { AuthService } from '../../auth/shared/services/auth/auth.service';
import { ProfileService } from '../../auth/shared/services/profile/profile.service';
import { TeamsService } from './services/teams/teams.service';
import { GroupsService } from './services/groups/groups.service';
import { MembersService } from './services/members/members.service';
import { NotesService } from './services/notes/notes.service';
import { PendingService } from './services/pending/pending.service';
import { EventsService } from './services/events/events.service';
import { ResourcesService } from './services/resources/resources.service';
import { UploadTaskComponent } from '../teams/files/upload-task/upload-task.component';
import { EnlargeThumbnailComponent } from './components/enlarge-thumbnail/enlarge-thumbnail.component';
import { MobileMenuComponent } from './components/mobile-menu/mobile-menu.component';
import { DarkService } from './services/dark/dark.service';
import { PresenceService } from './services/presence/presence.service';
import { UserPresenceComponent } from './components/user-presence/user-presence.component';
import { MessageFileComponent } from './components/message-file/message-file.component';
import { FilesFileComponent } from './components/files-file/files-file.component';
import { DropzoneDirective } from './directives/dropzone/dropzone.directive';
import { FileOptionsComponent } from './components/file-options/file-options.component';
import { CopyFileComponent } from './components/copy-file/copy-file.component';

import { AvatarModule } from 'ngx-avatar';
import { NgCircleProgressModule } from 'ng-circle-progress';
import {NgxFilesizeModule} from 'ngx-filesize';
import { EditGroupComponent } from './components/edit-group/edit-group.component';
import { ScanComponent } from '../teams/files/scan/scan.component';
import { BrowseComponent } from '../teams/files/browse/browse.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AvatarModule,
    NgCircleProgressModule,
    NgxFilesizeModule,
    IonicModule
  ],
  exports: [
    UploadTaskComponent, 
    EnlargeThumbnailComponent, 
    MobileMenuComponent, 
    UserPresenceComponent,
    MessageFileComponent,
    FilesFileComponent,
    DropzoneDirective,
    FileOptionsComponent,
    CopyFileComponent,
    EditGroupComponent,
    ScanComponent, 
    BrowseComponent
  ],
  declarations: [
    UploadTaskComponent, 
    EnlargeThumbnailComponent, 
    MobileMenuComponent, 
    UserPresenceComponent,
    MessageFileComponent,
    FilesFileComponent,
    DropzoneDirective,
    FileOptionsComponent,
    CopyFileComponent,
    EditGroupComponent,
    ScanComponent, 
    BrowseComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {
  static forRoot(): ModuleWithProviders<SharedModule> {
    return {
      ngModule: SharedModule,
      providers: [
        AuthService,
        ProfileService,
        TeamsService,
        GroupsService,
        MembersService,
        NotesService,
        PendingService,
        EventsService,
        ResourcesService,
        Badge,
        DarkService,
        PresenceService
      ]
    };
  }
}
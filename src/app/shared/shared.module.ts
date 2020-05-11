import { NgModule, ModuleWithProviders, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

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
import { BadgeService } from './services/badge/badge.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [UploadTaskComponent, EnlargeThumbnailComponent],
  declarations: [UploadTaskComponent, EnlargeThumbnailComponent],
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
        BadgeService,
        Badge
      ]
    };
  }
}
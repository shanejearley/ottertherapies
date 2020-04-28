import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

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

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ]
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
      ]
    };
  }
}
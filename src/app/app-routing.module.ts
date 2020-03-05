import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'Teams',
    pathMatch: 'full'
  },
  {
    path: 'Teams',
    loadChildren: './teams/teams.module#TeamsModule'
  },
  {
    path: 'Teams/:id',
    redirectTo: 'Teams/:id/Dashboard',
    pathMatch: 'full'
  },
  {
    path: 'Teams/:id/Dashboard',
    loadChildren: './teams/dashboard/dashboard.module#DashboardModule'
  },
  {
    path: 'Teams/:id/Calendar',
    loadChildren: './teams/calendar/calendar.module#CalendarModule'
  },
  {
    path: 'Teams/:id/Messages',
    loadChildren: './teams/messages/messages.module#MessagesModule'
  },
  {
    path: 'Teams/:id/Files',
    loadChildren: './teams/files/files.module#FilesModule'
  },
  {
    path: 'Teams/:id/Notes',
    loadChildren: './teams/notes/notes.module#NotesModule'
  },
  {
    path: 'Teams/:id/Team',
    loadChildren: './teams/team/team.module#TeamModule'
  },
  {
    path: 'Teams/:id/Child',
    loadChildren: './teams/child/child.module#ChildModule'
  },
  {
    path: 'Teams/:id/Resources',
    loadChildren: './teams/resources/resources.module#ResourcesModule'
  },
  {
    path: 'Teams/:id/Profile',
    loadChildren: './teams/profile/profile.module#ProfileModule'
  },
  {
    path: 'Teams/:id/Messages/Group/:groupId',
    loadChildren: './teams/messages/group/group.module#GroupModule'
  },
  {
    path: 'Teams/:id/Messages/Direct/:directId',
    loadChildren: './teams/messages/direct/direct.module#DirectModule'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}

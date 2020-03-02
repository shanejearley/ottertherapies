import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NotesRoutingModule } from './notes-routing.module';

import { NotesComponent } from './notes.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NotesRoutingModule
  ],
  declarations: [NotesComponent]
})
export class NotesModule {}

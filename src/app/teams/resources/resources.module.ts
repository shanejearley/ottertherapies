import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ResourcesRoutingModule } from './resources-routing.module';

import { ResourcesComponent } from './resources.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ResourcesRoutingModule
  ],
  declarations: [ResourcesComponent]
})
export class ResourcesModule {}

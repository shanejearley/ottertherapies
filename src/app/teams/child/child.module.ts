import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChildRoutingModule } from './child-routing.module';

import { ChildComponent } from './child.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChildRoutingModule
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [ChildComponent]
})
export class ChildModule {}

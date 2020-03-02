import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { DirectComponent } from './direct.component';

describe('DirectComponent', () => {
  let component: DirectComponent;
  let fixture: ComponentFixture<DirectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DirectComponent ],
      imports: [IonicModule.forRoot(), RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DirectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

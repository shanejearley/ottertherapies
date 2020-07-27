import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Plugins } from '@capacitor/core';
import { Observable, Subject } from 'rxjs';
import { Store } from 'src/store';
import { takeUntil, tap } from 'rxjs/operators';
const { Browser } = Plugins;

@Component({
  selector: 'auth-form',
  styleUrls: ['auth-form.component.scss'],
  templateUrl: 'auth-form.component.html'
})
export class AuthFormComponent implements OnInit {

  emailFocus: boolean = false;
  passwordFocus: boolean = false;

  showPassword: boolean = false;

  @Output()
  submitted = new EventEmitter<FormGroup>();

  login: boolean = true;

  form = this.fb.group({
    email: ['', Validators.email],
    password: ['', Validators.required]
  });

  dark$: Observable<boolean>;
  dark: boolean;

  private readonly onDestroy = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {}

  ngOnInit() {
    this.dark$ = this.store.select('dark');
    this.dark$.pipe(
      takeUntil(this.onDestroy),
      tap(dark => {
        this.dark = dark;
      })
    ).subscribe();
  }

  ionViewWillEnter() {
    this.showPassword = false;
  }

  async showPrivacy() {
    await Browser.open({ url: 'https://ottertherapies.com/privacy-and-terms' });
  }

  onSubmit() {
    if (this.form.valid) {
      this.submitted.emit(this.form);
    }
  }

  get passwordInvalid() {
    const control = this.form.get('password');
    return control.hasError('required') && control.touched;
  }

  get emailFormat() {
    const control = this.form.get('email');
    return control.hasError('email') && control.touched;
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

}
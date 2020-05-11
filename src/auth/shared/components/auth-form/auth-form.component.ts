import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Plugins } from '@capacitor/core';
const { Browser } = Plugins;

@Component({
  selector: 'auth-form',
  styleUrls: ['auth-form.component.scss'],
  templateUrl: 'auth-form.component.html'
})
export class AuthFormComponent {

  @Output()
  submitted = new EventEmitter<FormGroup>();

  form = this.fb.group({
    email: ['', Validators.email],
    password: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder
  ) {}

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

}
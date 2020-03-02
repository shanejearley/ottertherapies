import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../shared/services/auth/auth.service';

@Component({
  selector: 'register',
  template: `
    <div>
      <auth-form (submitted)="registerUser($event)">
        <h1>Register</h1>
        <a routerDirection="root" routerLink="/auth/login">Already have an account?</a>
        <ion-button type="submit" expand="block">
          Create account
        </ion-button>
        <div class="error" *ngIf="error">
          {{ error }}
        </div>
      </auth-form>
    </div>
  `
})
export class RegisterComponent {

  error: string;
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async registerUser(event: FormGroup) {
    const { email, password } = event.value;
    try {
      await this.authService.createUser(email, password);
      //this.router.navigate(['/']);
    } catch (err) {
      this.error = err.message;
    }
  }
}
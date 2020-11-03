import { firebaseEnv } from './firebase.environment';

export const environment = {
  production: false,
  ...firebaseEnv
};

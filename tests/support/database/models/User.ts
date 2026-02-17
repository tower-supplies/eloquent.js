import EloquentModel from './EloquentModel';

export interface TUser {
  id: number;
  name: string;
  age: number;
  email: string;
  town_id?: number;
}

export default class User extends EloquentModel<TUser> {}

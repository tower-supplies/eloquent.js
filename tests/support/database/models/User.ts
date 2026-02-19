import EloquentModel from './EloquentModel';
import Town from './Town';

export interface TUser {
  id: number;
  name: string;
  age: number;
  email: string;
  town_id?: number;
  town?: Town;
}

export default class User extends EloquentModel<TUser> {}

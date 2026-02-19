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

// The class without the interface properties
export class UserClass extends EloquentModel<TUser> {}

// Use declaration merging to add the properties to the class
interface User extends TUser {}
class User extends UserClass {}

export default User;

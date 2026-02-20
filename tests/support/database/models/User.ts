import EloquentModel from './EloquentModel';
import Town from './Town';

export interface UserAttributes {
  id: number;
  name: string;
  age: number;
  email: string;
  town_id?: number;
  town?: Town;
}

// The class without the interface properties
export class UserClass extends EloquentModel<UserAttributes> {}

// Use declaration merging to add the properties to the class
interface User extends UserAttributes {}
class User extends UserClass {}

export default User;

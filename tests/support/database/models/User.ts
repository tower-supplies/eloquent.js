import Comment from './Comment';
import EloquentModel from './EloquentModel';
import Order from './Order';
import Town from './Town';

export interface UserAttributes {
  id: number;
  name: string;
  age: number;
  email: string;
  town_id?: number;
  is_developer?: boolean;
  town?: Town;
  orders?: Order[];
  ordersPlaced?: Order[];
  comments?: Comment[];
  deleted?: boolean;
}

// The class without the interface properties
export class UserClass extends EloquentModel<UserAttributes> {}

// Use declaration merging to add the properties to the class
interface User extends UserAttributes {}
class User extends UserClass {}

export default User;

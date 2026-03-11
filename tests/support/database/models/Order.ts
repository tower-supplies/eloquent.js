import Comment from './Comment';
import EloquentModel from './EloquentModel';
import User from './User';

export interface OrderAttributes {
  id: number;
  reference: string;
  placed_by_id: number;
  placed_for_id: number;
  placedBy?: User;
  placedFor?: User;
  comments?: Comment[];
}

export class OrderClass extends EloquentModel<OrderAttributes> {}

interface Order extends OrderAttributes {}
class Order extends OrderClass {}

export default Order;

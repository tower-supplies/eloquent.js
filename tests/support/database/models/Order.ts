import EloquentModel from './EloquentModel';
import User from './User';

export interface OrderAttributes {
  id: number;
  reference: string;
  placed_by_id: number;
  placed_for_id: number;
  placedBy?: User;
  placedFor?: User;
}

export class OrderClass extends EloquentModel<OrderAttributes> {}

interface Order extends OrderAttributes {}
class Order extends OrderClass {}

export default Order;

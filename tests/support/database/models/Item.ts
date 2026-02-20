import EloquentModel from './EloquentModel';
import Product from './Product';

export interface ItemAttributes {
  id: number;
  name: string;
  product_id?: number;
  product?: Product;
}

// The class without the interface properties
export class ItemClass extends EloquentModel<ItemAttributes> {}

// Use declaration merging to add the properties to the class
interface Item extends ItemAttributes {}
class Item extends ItemClass {}

export default Item;

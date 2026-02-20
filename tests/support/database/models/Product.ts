import EloquentModel from './EloquentModel';
import Item from './Item';
import ProductProperty from './ProductProperty';

export interface ProductAttributes {
  id: number;
  name: string;
  items: Item[];
  productProperties: ProductProperty[];
}

// The class without the interface properties
export class ProductClass extends EloquentModel<ProductAttributes> {}

// Use declaration merging to add the properties to the class
interface Product extends ProductAttributes {}
class Product extends ProductClass {}

export default Product;

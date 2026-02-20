import EloquentModel from './EloquentModel';
import Product from './Product';

export interface ProductPropertyAttributes {
  id: number;
  field: string;
  value?: string;
  product_id?: number;
  product?: Product;
}

export class ProductPropertyClass extends EloquentModel<ProductPropertyAttributes> {}

interface ProductProperty extends ProductPropertyAttributes {}
class ProductProperty extends ProductPropertyClass {}

export default ProductProperty;

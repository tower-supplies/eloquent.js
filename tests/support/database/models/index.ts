import County, { CountyAttributes, CountyClass } from './County';
import Item, { ItemAttributes, ItemClass } from './Item';
import NoKey, { NoKeyAttributes, NoKeyClass } from './NoKey';
import NoTable, { NoTableAttributes, NoTableClass } from './NoTable';
import Order, { OrderAttributes, OrderClass } from './Order';
import Product, { ProductAttributes, ProductClass } from './Product';
import ProductProperty, { ProductPropertyAttributes, ProductPropertyClass } from './ProductProperty';
import Town, { TownAttributes, TownClass } from './Town';
import User, { UserAttributes, UserClass } from './User';

// List of models
const DatabaseModels = {
  NoKey,
  User,
  Town,
  County,
  Item,
  Order,
  Product,
  ProductProperty,
};

// Export classes
export {
  CountyClass,
  ItemClass,
  NoKeyClass,
  NoTableClass,
  OrderClass,
  ProductClass,
  ProductPropertyClass,
  TownClass,
  UserClass,
};

// Export models
export { County, Item, NoKey, NoTable, Order, Product, ProductProperty, Town, User };

// Export attributes
export {
  CountyAttributes,
  ItemAttributes,
  NoKeyAttributes,
  NoTableAttributes,
  OrderAttributes,
  ProductAttributes,
  ProductPropertyAttributes,
  TownAttributes,
  UserAttributes,
};

export default DatabaseModels;

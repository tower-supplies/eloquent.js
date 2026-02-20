import County, { CountyAttributes, CountyClass } from './County';
import NoKey, { NoKeyAttributes, NoKeyClass } from './NoKey';
import NoTable, { NoTableAttributes, NoTableClass } from './NoTable';
import Town, { TownAttributes, TownClass } from './Town';
import User, { UserAttributes, UserClass } from './User';

// List of models
const DatabaseModels = {
  NoKey,
  User,
  Town,
  County,
};

// Export classes
export { CountyClass, NoKeyClass, NoTableClass, TownClass, UserClass };

// Export models
export { County, NoKey, NoTable, Town, User };

// Export types
export { CountyAttributes, NoKeyAttributes, NoTableAttributes, TownAttributes, UserAttributes };

export default DatabaseModels;

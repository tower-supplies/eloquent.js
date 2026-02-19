import County, { CountyClass, TCounty } from './County';
import NoKey, { NoKeyClass, TNoKey } from './NoKey';
import NoTable, { NoTableClass, TNoTable } from './NoTable';
import Town, { TTown, TownClass } from './Town';
import User, { TUser, UserClass } from './User';

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
export { TCounty, TNoKey, TNoTable, TTown, TUser };

export default DatabaseModels;

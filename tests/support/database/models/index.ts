import County, { TCounty } from './County';
import NoKey, { TNoKey } from './NoKey';
import Town, { TTown } from './Town';
import User, { TUser } from './User';

// List of models
const DatabaseModels = {
  NoKey,
  User,
  Town,
  County,
};

// Export models
export { County, NoKey, Town, User };

// Export types
export { TCounty, TNoKey, TTown, TUser };

export default DatabaseModels;

import County from './County';
import EloquentModel from './EloquentModel';
import User from './User';

export interface TownAttributes {
  id: number;
  name: string;
  county_id: number;
  county?: County;
  users?: User[];
}

export class TownClass extends EloquentModel<TownAttributes> {}

interface Town extends TownAttributes {}
class Town extends TownClass {}

export default Town;

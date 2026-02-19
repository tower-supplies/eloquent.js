import County from './County';
import EloquentModel from './EloquentModel';
import User from './User';

export interface TTown {
  id: number;
  name: string;
  county_id: number;
  county?: County;
  users?: User[];
}

export default class Town extends EloquentModel<TTown> {}

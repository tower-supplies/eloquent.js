import Model from '@/classes/Model';

import { TDatabase } from '../types';

export default abstract class EloquentModel<TAttributes> extends Model<TAttributes, TDatabase> {}

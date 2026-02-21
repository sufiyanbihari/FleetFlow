import { SetMetadata } from '@nestjs/common';
import { Resource, Action } from '../constants/permission-map';

export const PERMISSION_KEY = 'permission';

export const Permission = (resource: Resource, action: Action) =>
  SetMetadata(PERMISSION_KEY, { resource, action });

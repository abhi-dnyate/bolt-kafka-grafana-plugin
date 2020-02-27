/*
 *
 *  Copyright (C) 2019 Bolt Analytics Corporation
 *
 *      Licensed under the Apache License, Version 2.0 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 *
 */

import { DataSourcePlugin } from '@grafana/ui';

import { BoltDatasource } from './datasource';

import { BoltQueryEditor } from './queryEditor';
import { BoltOptions, BoltQuery } from './types';

export class BoltConfigControl {
  static templateUrl = 'partials/config.html';
}

export const plugin = new DataSourcePlugin<BoltDatasource, BoltQuery, BoltOptions>(BoltDatasource)
  .setConfigCtrl(BoltConfigControl)
  .setQueryEditor(BoltQueryEditor);

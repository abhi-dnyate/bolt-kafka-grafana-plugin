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
import React from 'react';
import { PureComponent } from 'react';

// Types
import { BoltDatasource } from './datasource';
import { BoltQuery, BoltOptions } from './types';

import { QueryEditorProps, FormField } from '@grafana/ui';

type Props = QueryEditorProps<BoltDatasource, BoltQuery, BoltOptions>;

interface State extends BoltQuery {}

export class BoltQueryEditor extends PureComponent<Props, State> {
  query: BoltQuery;

  constructor(props: Props) {
    super(props);

    const { query } = this.props;
    this.query = query;

    this.state = {
      ...this.state,
      query: '/topics/$TOPICNAME/partitions/0/messages',
      topicName: query.topicName || '',
    };

    const { onChange } = this.props;
    onChange({
      ...this.props.query,
      ...this.state,
    });
  }

  render() {
    const { topicName } = this.state;
    const labelWidth = 8;

    return (
      <div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <div className="gf-form">
              <FormField
                label="Topic Name"
                type="text"
                value={topicName}
                labelWidth={labelWidth}
                width={4}
                name="topicName"
                onChange={this.onFieldValueChange}
              ></FormField>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onFieldValueChange = (event: any, _name?: string) => {
    const name = _name ? _name : event.target.name;
    const value = event.target.value;

    this.setState({
      ...this.state,
      [name]: value,
    });

    const { onChange } = this.props;
    onChange({
      ...this.props.query,
      [name]: value,
    });
  };
}

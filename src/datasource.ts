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

import { DataQueryRequest, DataSourceApi, DataSourceInstanceSettings } from '@grafana/ui';
import { DataFrame } from '@grafana/data';
import { BoltQuery, BoltOptions } from './types';
import { getBackendSrv } from '@grafana/runtime';
import { Utils } from 'datasourceUtils';

import _ from 'lodash';

export class BoltDatasource extends DataSourceApi<BoltQuery, BoltOptions> {
  data: DataFrame[] = [];
  baseUrl: any = '';
  anCollection = '';
  jobConfigCollection = '';
  rawCollection = '';
  rawCollectionType = 'single';
  timestampField = 'timestamp';
  anomalyThreshold = 5;
  topN = 10;
  rawCollectionWindow = 1;
  backendSrv: any;
  qTemp: any;
  $q: any;
  templateSrv: any;

  jobIdMappings: { dashboards: any; panels: any };

  totalCount?: number = undefined;

  facets: any = {};

  constructor(instanceSettings: DataSourceInstanceSettings<BoltOptions>, $q: any, templateSrv: any) {
    super(instanceSettings);

    this.jobIdMappings = { dashboards: {}, panels: {} };
    this.$q = $q;
    this.templateSrv = templateSrv;
    this.baseUrl = instanceSettings.url;

    if (instanceSettings.jsonData) {
    }

    this.backendSrv = getBackendSrv();

    this.buildValuesMap();
  }

  metricFindQuery(query: string) {
    if (!query || query.length === 0) {
      return Promise.resolve([]);
    }

    const pattern1 = /^getPageCount\(\$(.*),\s*\$(.*)\)$/;
    const pattern2 = /^(.*)\((.*):\s*(.*),\s*(.*)\)$/;

    const matches1: any = query.match(pattern1);
    const matches2: any = query.match(pattern2);

    if (matches1 && matches1.length === 3) {
      return this.getTotalCount(matches1);
    } else if (matches2 && matches2.length === 5) {
      return this.getFields(matches2);
    } else {
      return Promise.reject({
        status: 'error',
        message: 'Supported options are: <collection_name>(<filter>,<field_name>) and getPageCount($PageSize, $Search)',
        title: 'Error while adding the variable',
      });
    }
  }

  query(options: DataQueryRequest<BoltQuery>): any {
    const targetPromises = options.targets
      .map((query: BoltQuery) => {
        // If user has added page number variable the count is computed in template init (metricFindQuery) No need to fire the Query on solr again

        /*const collection = _.keys(this.facets).includes(query.queryType) ? this.anCollection : query.collection;
        if (!query.query) {
          return Promise.resolve([]);
        }

        let q = this.getQueryString(query, options);

        // Provision for empty series filter
        if (q.match(/AND\s*$/)) {
          q = q.slice(0, q.lastIndexOf('AND'));
        }

        let start = this.templateSrv.replace(query.start, options.scopedVars);
        let numRows = this.templateSrv.replace(query.numRows.toString(), options.scopedVars) || 100;
        if (query.queryType === 'chart') {
          numRows = 1000; // Cursor page size
        } else {
          numRows = ['count', 'facet'].includes(query.queryType) ? 0 : numRows;
        }
        numRows = Number(numRows);
        start = numRows * Number(start);

        const startTime = options.range.from.toISOString();
        const endTime = options.range.to.toISOString();

        const solrQueryBody: any = {};
        solrQueryBody.query = q;

        // Add basic query fields
        const solrQueryParams: any = {
          fq: this.timestampField + ':[' + startTime + ' TO ' + endTime + ']',
          fl: this.timestampField + (query.fl ? ',' + query.fl : ''),
          rows: numRows,
          start: start,
        };

        // Add fields specific to raw logs and single stat on raw logs
        if (query.queryType === 'rawlogs' || query.queryType === 'count' || query.queryType === 'slowQueries') {
          solrQueryParams['collectionWindow'] = this.rawCollectionWindow;
          solrQueryParams['startTime'] = startTime;
          solrQueryParams['endTime'] = endTime;
          solrQueryParams['getRawMessages'] = true;
        }

        if (query.queryType === 'slowQueries') {
          solrQueryParams['rex.message.q'] = query.rexQuery;
          solrQueryParams['rex.message.outputfields'] = query.rexOutFields;
        }

        // Set facet fields for heatmap, linechart and count (only in case of multi collection mode due to plugin numFound limitation)
        // TODO: Find out why numFound is returned only after specifying the facet
        if (query.queryType === 'count' && this.rawCollectionType === 'multi') {
          solrQueryParams['facet'] = true;
          solrQueryParams['facet.field'] = 'id';
          solrQueryParams['facet.limit'] = 2;
        } else if (_.keys(this.facets).includes(query.queryType)) {
          const aggInterval = this.templateSrv.replace(query.aggInterval, options.scopedVars) || '+1HOUR';
          solrQueryParams['facet'] = true;
          solrQueryParams['json.facet'] = this.facets[query.queryType]
            .replace('__AGG_INTERVAL__', aggInterval)
            .replace('__START_TIME__', startTime)
            .replace('__END_TIME__', endTime)
            .replace(/__TOPN__/g, this.topN)
            .replace('__SCORE_THRESHOLD__', this.anomalyThreshold);
        } else {
          delete solrQueryParams['facet'];
          delete solrQueryParams['json.facet'];
        }

        // for cursor to work. Will sort by ts later
        if (query.queryType === 'chart') {
          solrQueryParams['sort'] = 'id asc';
        } else if (query.sortField) {
          solrQueryParams['sort'] =
            this.templateSrv.replace(query.sortField, options.scopedVars) + ' ' + this.templateSrv.replace(query.sortOrder, options.scopedVars);
        }
      */

        let myQuery = query.query;
        // /topics/$TOPICNAME/partitions/0/messages?timestamp=$FROM_TIME&count=288
        myQuery = myQuery.replace('$TOPICNAME', query.topicName); //.replace('$FROM_TIME',options.range.from.toISOString());

        const kafkaQueryParams = {
          timestamp: options.range.from.toISOString(),
          count: 2400,
        }; //?timestamp=$FROM_TIME&count=288'

        const httpOpts = {
          url: this.baseUrl + myQuery,
          method: 'GET',
          headers: { Accept: 'application/vnd.kafka.v1+json' },
          params: kafkaQueryParams,
          //data: solrQueryBody, // There can be a big query due to long jobIds and hence it is sent in post request body
        };

        return this.sendQueryRequest([], httpOpts, query, 'main'); // cursor mark or charts
      })
      .values();

    const series: any = {};
    const resultSeries: any[] = [];

    return Promise.all(targetPromises).then(responses => {
      responses.forEach(resp => {
        resp.forEach((r: any) => {
          r.data.forEach((s: any) => {
            if (s.type === 'table') {
              resultSeries.push(s);
            } else {
              series[s.target] = !series[s.target] ? s.datapoints : series[s.target].concat(s.datapoints);
            }
          });
        });
      });

      _.keys(series).forEach(key => {
        resultSeries.push({
          target: key,
          datapoints: series[key].sort((a: any, b: any) => {
            return a[1] - b[1];
          }),
        });
      });

      const result = {
        data: resultSeries,
      };

      return result;
    });
  }

  testDatasource() {
    //GET  "http://localhost:8082/topics"
    const options = {
      url: this.baseUrl + '/topics',
      method: 'GET',
    };
    return this.backendSrv
      .datasourceRequest(options)
      .then((response: any) => {
        if (response.status === 200) {
          return {
            status: 'success',
            message: 'Data source is working',
            title: 'Success',
          };
        } else {
          return {
            status: 'error',
            message: 'Data source is NOT working',
            title: 'Error',
          };
        }
      })
      .catch((error: any) => {
        return {
          status: 'error',
          message: error.status + ': ' + error.statusText,
          title: 'Error',
        };
      });
  }

  sendQueryRequest(respArr: any[], options: any, query: BoltQuery, requestType: any, cursor?: any) {
    /*params.method = 'POST';
    params.headers = { 'Content-Type': 'application/json' };*/

    if (cursor) {
      options.params['cursorMark'] = cursor;
    }
    //let fromTimestamp = 0;
    if (requestType === 'main') {
      if (query.topicName === 'Network_Traffic_v1' && this.templateSrv.timeRange.to - this.templateSrv.timeRange.from > 1800 * 1000) {
        // if request is to get data more than half hour
        const fromTimestamp = this.templateSrv.timeRange.to.toDate();
        fromTimestamp.setTime(fromTimestamp.getTime() - 1800000);
        //this.templateSrv.timeRange.from = this.templateSrv.timeRange.to - 1800 * 1000;

        const kafkaQueryParams = {
          timestamp: fromTimestamp,
          count: 2400,
        }; //?timestamp=$FROM_TIME&count=288'

        options.params = kafkaQueryParams;
      }
    }

    return this.backendSrv
      .datasourceRequest(options)
      .then((response: any) => {
        if (response.status === 200) {
          //const groupMap = this.jobIdMappings;

          const processedData = Utils.processResponse(response, this.templateSrv);

          respArr.push(processedData);

          if (requestType === 'main') {
            if (query.topicName === 'Network_Traffic_v1' && this.templateSrv.timeRange.to - this.templateSrv.timeRange.from > 1800 * 1000) {
              // if request is to get data more than half hour
              //this.templateSrv.timeRange.from = this.templateSrv.timeRange.to;
              //this.templateSrv.timeRange.to = this.templateSrv.timeRange.to - 1800 * 1000;

              let myQuery = query.query;
              myQuery = myQuery.replace('$TOPICNAME', 'Network_Traffic_Hourly'); //.replace('$FROM_TIME',options.range.from.toISOString());
              options.url = this.baseUrl + myQuery;
              const kafkaQueryParams = {
                timestamp: this.templateSrv.timeRange.from.toISOString(),
                count: 2400,
              }; //?timestamp=$FROM_TIME&count=288'

              options.params = kafkaQueryParams;

              return this.sendQueryRequest(respArr, options, query, 'sub');
            }
          }

          return respArr;
        } else {
          return Promise.reject([
            {
              status: 'error',
              message: 'Error',
              title: 'Error',
            },
          ]);
        }
      })
      .catch((error: any) => {
        return Promise.reject([
          {
            status: 'error',
            message: error.status + ': ' + error.statusText,
            title: 'Error while accessing data',
          },
        ]);
      });
  }

  getFields(matches: any) {
    const collection = matches[1];
    const filterField = matches[2];
    let filterFieldVal = matches[3].replace('$', '');
    const field = matches[4];

    const variable = this.templateSrv.variables.find((v: any) => v.name === filterFieldVal);
    if (variable) {
      let resolvedFilterValues: string[] = [];
      if (typeof variable.current.value !== 'object') {
        resolvedFilterValues.push(variable.current.value);
      } else {
        resolvedFilterValues = variable.current.value;
      }

      if (resolvedFilterValues[0] === '$__all') {
        if (!variable || !variable.options || variable.options.length < 2) {
          filterFieldVal = '';
        } else {
          const allValues = variable.options
            .slice(1)
            .map((opt: any) => {
              let fieldName = opt.text;
              if (filterField === 'jobId') {
                Object.keys(this.jobIdMappings.panels).forEach((k: string) => {
                  if (this.jobIdMappings.panels[k] === fieldName) {
                    fieldName = k;
                  }
                });
              }
              return fieldName;
            })
            .join(' OR ');
          filterFieldVal = '(' + allValues + ')';
        }
      } else {
        resolvedFilterValues = resolvedFilterValues.map(dashboard => {
          let fieldName = dashboard;
          if (filterField === 'jobId') {
            Object.keys(this.jobIdMappings.panels).forEach((k: string) => {
              if (this.jobIdMappings.panels[k] === fieldName) {
                fieldName = k;
              }
            });
          }
          return fieldName;
        });
        filterFieldVal = '(' + resolvedFilterValues.join(' OR ') + ')';
      }
    }

    const url = this.baseUrl + '/' + collection + '/select?facet=true&facet.field=' + field + '&wt=json&rows=0&facet.limit=-1';
    const params = {
      url: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { query: filterField + ': ' + filterFieldVal },
    };
    return this.backendSrv.datasourceRequest(params).then((response: any) => {
      if (response.status === 200) {
        return Utils.mapToTextValue(response);
      } else {
        return Promise.reject([
          {
            status: 'error',
            message: 'Error',
            title: 'Error',
          },
        ]);
      }
    });
  }

  buildValuesMap() {
    const url = this.baseUrl + '/' + this.jobConfigCollection + '/select?q=jobId:*&fl=jobId,name,searchGroup&rows=10000';
    const params = {
      url: url,
      method: 'GET',
    };
    return this.backendSrv.datasourceRequest(params).then((response: any) => {
      if (response.status === 200) {
        this.jobIdMappings = { dashboards: {}, panels: {} };
        response.data.response.docs.forEach((doc: any) => {
          this.jobIdMappings.dashboards[doc.jobId] = '"' + doc.searchGroup[0] + '"';
          this.jobIdMappings.panels[doc.jobId] = '"' + doc.name + '"';
        });
      }
    });
  }

  getTotalCount(matches: any) {
    const pageSizeVar = matches[1];
    const searchVar = matches[2];

    const searchQuery = this.templateSrv.variables.find((v: any) => v.name === searchVar);
    if (!searchQuery) {
      this.totalCount = undefined;
      return Promise.reject({
        status: 'error',
        message: '$' + searchVar + ' not found in variables',
        title: 'Error while adding the variable',
      });
    }

    const pageSize = this.templateSrv.variables.find((v: any) => v.name === pageSizeVar);
    if (!pageSize) {
      this.totalCount = undefined;
      return Promise.reject({
        status: 'error',
        message: '$' + pageSizeVar + ' not found in variables',
        title: 'Error while adding the variable',
      });
    }

    const params = {
      q: searchQuery.query,
      rows: 0,
      fq: 'timestamp:[' + this.templateSrv.timeRange.from.toJSON() + ' TO ' + this.templateSrv.timeRange.to.toJSON() + ']',
      getRawMessages: true,
      startTime: this.templateSrv.timeRange.from.toJSON(),
      endTime: this.templateSrv.timeRange.to.toJSON(),
      facet: true,
      'facet.field': 'id',
      'facet.limit': 2,
    };

    const options = {
      url: this.baseUrl + '/' + this.rawCollection + '/select?wt=josn',
      method: 'GET',
      params: params,
    };

    return this.backendSrv.datasourceRequest(options).then((data: any) => {
      this.totalCount = data.data.response.numFound;
      return Utils.getFirstAndLastNResults(data, pageSize);
    });
  }

  getQueryString(query: BoltQuery, options: DataQueryRequest<BoltQuery>) {
    let q: string;
    const queryStr = this.templateSrv.replace(query.query, options.scopedVars);
    const matches = queryStr.match(/__dashboard__:\s*(.*)/);
    let matches2 = queryStr.match(/__panel__:\s*(.*) AND .*/);
    if (!matches2) {
      matches2 = queryStr.match(/__panel__:\s*(.*)/);
    }

    if (matches && matches.length === 2) {
      // Dashboard case
      const dahsboardName: string = matches[1];
      if (dahsboardName === '*') {
        q = queryStr.replace('__dashboard__', 'jobId');
      } else if (dahsboardName.startsWith('{')) {
        // All option
        const jobIdList: any[] = [];
        const dashboards = dahsboardName
          .replace('{', '')
          .replace('}', '')
          .split(',');

        dashboards.forEach(dashboard => {
          const jobId: string[] = Object.keys(this.jobIdMappings.dashboards).filter(jobId => {
            return this.jobIdMappings.dashboards[jobId] === dashboard;
          });

          if (jobId) {
            jobId.forEach(job => jobIdList.push(job));
          }
        });

        const jobIdStr = '(' + jobIdList.join(' OR ') + ')';
        q = queryStr.replace('__dashboard__', 'jobId').replace(dahsboardName, jobIdStr);
      } else {
        // particular option
        const jobIdList: string[] = Object.keys(this.jobIdMappings.dashboards).filter((jobId: string) => {
          return this.jobIdMappings.dashboards[jobId] === dahsboardName;
        });

        const jobIdStr = '( ' + jobIdList.join(' OR ') + ' )';
        q = queryStr.replace('__dashboard__', 'jobId').replace(dahsboardName, jobIdStr);
      }
      q = Utils.queryBuilder(q);
    } else if (matches2 && matches2.length === 2) {
      // Panel case
      const panelName: string = matches2[1];

      if (panelName === '*') {
        q = queryStr.replace('__panel__', 'jobId');
      } else if (panelName.startsWith('{')) {
        // All option
        const jobIdList: any[] = [];
        const panels = panelName
          .replace('{', '')
          .replace('}', '')
          .split(',');

        panels.forEach(panel => {
          const jobId = Object.keys(this.jobIdMappings.panels).filter(jobId => {
            return this.jobIdMappings.panels[jobId] === panel;
          });

          if (jobId) {
            jobIdList.push(jobId);
          }
        });

        const jobIdStr = '(' + jobIdList.join(' OR ') + ')';
        q = queryStr.replace('__panel__', 'jobId').replace(panelName, jobIdStr);
      } else {
        // particular option
        const jobIdList: string[] = Object.keys(this.jobIdMappings.panels).filter((jobId: string) => {
          return this.jobIdMappings.panels[jobId] === panelName;
        });

        const jobIdStr = '( ' + jobIdList.join(' OR ') + ' )';
        q = queryStr.replace('__panel__', 'jobId').replace(panelName, jobIdStr);
      }
      q = Utils.queryBuilder(q);
    } else {
      q = Utils.queryBuilder(queryStr);
    }

    return q;
  }
}

export default BoltDatasource;

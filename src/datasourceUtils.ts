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

export class Utils {
  static processResponse(response: any, templateSrv: any) {
    const data = response.data;
    let seriesList: any[] = [];
    const actualSentSeries: any[] = [];
    const actualReceivedcSeries: any[] = [];

    const sentDataMap: any = {};
    const receivedDataMap: any = {};
    const hostMap: any = {};
    const ruleMap: any = {};
    const deniedDestinationMap: any = {};

    const fromTime = templateSrv.timeRange.from;
    const toTime = templateSrv.timeRange.to;

    data.forEach((dataPoint: any) => {
      const decodedValue: any = JSON.parse(atob(dataPoint.value));
      const d: Date = new Date(decodedValue.timestamp);
      const ts = d.getTime();

      if (ts < fromTime || ts > toTime) {
        return;
      }

      if (decodedValue['jobId'] === 'Denied_Hosts') {
        const hostName = decodedValue['DENIEDHOST'];
        if (!Object.keys(hostMap).includes(hostName)) {
          hostMap[hostName] = [];
        }
        hostMap[hostName].push([decodedValue['COUNT'], ts]);
      } else if (decodedValue['jobId'] === 'rule') {
        const ruleName = decodedValue['RULE'];
        if (!Object.keys(ruleMap).includes(ruleName)) {
          ruleMap[ruleName] = [];
        }
        ruleMap[ruleName].push([decodedValue['COUNT'], ts]);
      } else if (decodedValue['jobId'] === 'Denied_Destination_Cities_v1') {
        const cityName = decodedValue['DESTINATION_CITIES'];
        if (!Object.keys(deniedDestinationMap).includes(cityName)) {
          deniedDestinationMap[cityName] = [];
        }
        deniedDestinationMap[cityName].push([decodedValue['COUNT'], ts]);
      } else {
        sentDataMap[ts] = decodedValue['Bytes_Sent'];
        receivedDataMap[ts] = decodedValue['Bytes_Received'];
      }
    });

    if (Object.keys(hostMap).length > 0) {
      Object.keys(hostMap).forEach(host => {
        seriesList.push({
          target: host,
          datapoints: hostMap[host],
        });
      });
    } else if (Object.keys(ruleMap).length > 0) {
      Object.keys(ruleMap).forEach(rule => {
        seriesList.push({
          target: rule,
          datapoints: ruleMap[rule],
        });
      });
    } else if (Object.keys(deniedDestinationMap).length > 0) {
      Object.keys(deniedDestinationMap).forEach(city => {
        seriesList.push({
          target: city,
          datapoints: deniedDestinationMap[city],
        });
      });
    } else {
      Object.keys(sentDataMap).forEach((ts: any) => {
        actualSentSeries.push([sentDataMap[ts], ts]);
      });

      Object.keys(receivedDataMap).forEach((ts: any) => {
        actualReceivedcSeries.push([receivedDataMap[ts], ts]);
      });

      seriesList.push({
        target: 'Bytes_sent',
        datapoints: actualSentSeries,
      });

      seriesList.push({
        target: 'Bytes_received',
        datapoints: actualReceivedcSeries,
      });
    }

    // Process line chart facet response
    /*
    if (data.facets && data.facets.lineChartFacet) {
      seriesList = [];
      let sortBaselineSeries: any[] = [];
      const jobs = data.facets.lineChartFacet.buckets;
      jobs.forEach((job: any) => {
        const partFields = job.group.buckets;
        partFields.forEach((partField: any) => {
          const dashboardName = groupMap.dashboards[job.val] ? groupMap.dashboards[job.val] + '_' : '';
          const panelName = groupMap.panels[job.val] ? groupMap.panels[job.val] : '';
          let jobIdWithPartField: string = dashboardName + panelName;
          const partFieldJson = JSON.parse(partField.val);
          Object.keys(partFieldJson).forEach(key => {
            if (key === 'aggr_field') {
              return;
            }
            jobIdWithPartField += '_' + key + '_' + partFieldJson[key];
          });
          jobIdWithPartField += '_' + partFieldJson.aggr_field;

          if (jobIdWithPartField.startsWith('_')) {
            jobIdWithPartField = jobIdWithPartField.slice(1);
          }

          const buckets = partField.timestamp.buckets;
          const actualSeries: any[] = [];
          const scoreSeries: any[] = [];
          const anomalySeries: any[] = [];
          const expectedSeries: any[] = [];
          buckets.forEach((timeBucket: any) => {
            const d: Date = new Date(timeBucket.val);
            const ts = d.getTime();
            const actual = timeBucket.actual.buckets[0].val;
            let score = timeBucket.score.buckets[0].val;
            let anomaly = timeBucket.anomaly.buckets[0].val;
            const expected = timeBucket.expected.buckets[0].val;
            if (score >= anomalyThreshold && anomaly) {
              anomaly = actual;
            } else {
              anomaly = null;
              score = null;
            }
            actualSeries.push([actual, ts]);
            scoreSeries.push([score, ts]);
            anomalySeries.push([anomaly, ts]);
            expectedSeries.push([expected, ts]);
          });

          seriesList.push({
            target: jobIdWithPartField + ' actual',
            datapoints: actualSeries,
          });
          seriesList.push({
            target: jobIdWithPartField + ' score',
            datapoints: scoreSeries,
          });
          //Sort baseline is score value.
          sortBaselineSeries.push({
            target: jobIdWithPartField,
            datapoints: scoreSeries,
          });
          seriesList.push({
            target: jobIdWithPartField + ' anomaly',
            datapoints: anomalySeries,
          });
          seriesList.push({
            target: jobIdWithPartField + ' expected',
            datapoints: expectedSeries,
          });
        });
      });
      sortBaselineSeries = this.sortList(sortBaselineSeries, topN);
      seriesList = this.getSortedSeries(seriesList, sortBaselineSeries, indvAnOutField);
    } else if (data.facets && data.facets.correlation) {
      seriesList = [];
      const jobs = data.facets.correlation.buckets;

      let baseline: number[] = [];
      // Find baseline series and populate base metric
      jobs.forEach((job: any) => {
        if (job.val === correlationMetric) {
          const partFields = job.group.buckets;
          partFields.forEach((partField: any) => {
            const partFieldJson = JSON.parse(partField.val);
            const jobIdWithPartField = partFieldJson.aggr_field;
            const buckets = partField.timestamp.buckets;
            const actualSeries: any[] = [];
            buckets.forEach((timeBucket: any) => {
              const d: Date = new Date(timeBucket.val);
              const ts = d.getTime();
              const actual = timeBucket.actual.buckets[0].val;

              actualSeries.push([actual, ts]);
              baseline.push(actual);
            });

            seriesList.push({
              target: jobIdWithPartField,
              datapoints: actualSeries,
            });
          });
        }
      });

      baseline = Utils.getStdDev(baseline);

      // Populate other metrics and find deviation from baseline
      jobs.forEach((job: any) => {
        if (job.val !== correlationMetric) {
          const partFields = job.group.buckets;
          partFields.forEach((partField: any) => {
            const partFieldJson = JSON.parse(partField.val);
            const jobIdWithPartField = partFieldJson.aggr_field;
            const buckets = partField.timestamp.buckets;
            const actualSeries: any[] = [];

            let compare: any[] = [];
            buckets.forEach((timeBucket: any) => {
              const d: Date = new Date(timeBucket.val);
              const ts = d.getTime();
              const actual = timeBucket.actual.buckets[0].val;
              compare.push(actual);
              actualSeries.push([actual, ts]);
            });

            compare = Utils.getStdDev(compare);
            const dev = this.findCorrelation(baseline, compare);

            seriesList.push({
              target: jobIdWithPartField + ': ' + dev.toFixed(3),
              datapoints: actualSeries,
            });
          });
        }
      });
    } else if (data.facets && data.facets.heatMapByPartFieldsFacet) {
      // Heatmap
      seriesList = [];
      const jobs = data.facets.heatMapByPartFieldsFacet.buckets;
      jobs.forEach((job: any) => {
        const partBuckets = job.partField.buckets;
        partBuckets.forEach((partField: any) => {
          const score: number = partField.s;
          const dayBuckets = partField.Day0.buckets;
          const seriesData: any[] = [];
          dayBuckets.forEach((bucket: any) => {
            const d: Date = new Date(bucket.val);
            if (bucket.score != null && bucket.score.score != null) {
              seriesData.push([bucket.score.score, d.getTime()]);
            } else {
              seriesData.push([0, d.getTime()]);
            }
          });
          // Derive series name from part fields
          const partFieldJson = JSON.parse(partField.val);
          const dashboardName = groupMap.dashboards[job.val] ? groupMap.dashboards[job.val] + '_' : '';
          const panelName = groupMap.panels[job.val] ? groupMap.panels[job.val] : '';
          let seriesName = dashboardName + panelName;
          Object.keys(partFieldJson).forEach(key => {
            if (key === 'aggr_field') {
              return;
            }
            seriesName += '_' + key + '_' + partFieldJson[key];
          });
          seriesName += '_' + partFieldJson.aggr_field;

          if (seriesName.startsWith('_')) {
            seriesName = seriesName.slice(1);
          }

          seriesList.push({
            target: seriesName,
            datapoints: seriesData,
            score: score,
          });
        });
      });

      seriesList = this.sortList(seriesList, topN).reverse(); // reverse because heatmap starts from bottom
    } else if (data.facets && data.facets.heatMapFacet) {
      // Heatmap
      seriesList = [];
      const jobs = data.facets.heatMapFacet.buckets;
      jobs.forEach((job: any) => {
        const dayBuckets = job.Day0.buckets;
        const seriesData: any[] = [];
        dayBuckets.forEach((bucket: any) => {
          const d: Date = new Date(bucket.val);
          if (bucket.score != null && bucket.score.score != null) {
            seriesData.push([bucket.score.score, d.getTime()]);
          } else {
            seriesData.push([0, d.getTime()]);
          }
        });

        const dashboardName = groupMap.dashboards[job.val] ? groupMap.dashboards[job.val] + '_' : '';
        const panelName = groupMap.panels[job.val] ? groupMap.panels[job.val] : '';
        const targetName = dashboardName + panelName;
        seriesList.push({
          jobId: job.val,
          target: targetName !== '' ? targetName : job.val,
          datapoints: seriesData,
        });
      });

      if (grouppingEmabled) {
        seriesList = Utils.getGrouppedResults(seriesList, groupMap);
      }

      seriesList = this.sortList(seriesList).reverse(); // reverse because heatmap starts from bottom
    } else if (format === 'rawlogs' || format === 'slowQueries') {
      // Table
      const columns: any[] = [];
      const rows: any[] = [];
      seriesList = {};
      let index = 0;
      if (data && data.response && data.response.docs) {
        data.response.docs.forEach((item: any) => {
          const row = [];
          for (const property in item) {
            // Set columns
            if (index === 0 && item.hasOwnProperty(property)) {
              if (property === timeField) {
                columns.unshift({ type: 'time', text: 'Time' });
              } else {
                columns.push({ type: 'string', text: property });
              }
            }
            // Set rows
            if (property === timeField) {
              const d: Date = new Date(item[timeField]);

              const ts = d.getTime(); //.unix() * 1000;
              row.unshift(ts);
            } else {
              row.push(item[property]);
            }
          }
          index++;
          rows.push(row);
        });
      }
      seriesList = [
        {
          type: 'table',
          columns: columns,
          rows: rows,
        },
      ];
    } else if (format === 'count') {
      seriesList = [];
      const numResults = data && data.response && data.response.numFound ? data.response.numFound : 0;
      seriesList.push({
        target: 'Number of docs',
        datapoints: [[numResults, '']],
      });
    } else if (format === 'chart') {
      // Charts
      seriesList = [];
      data.response.docs.forEach((item: any) => {
        for (const property in item) {
          if (item.hasOwnProperty(property) && property !== timeField) {
            if (typeof series[property] === 'undefined') {
              series[property] = [];
            }
            const date = new Date(item[timeField]);
            const ts = date.getTime();
            series[property].push([item[property] || 0, ts]);
          }
        }
      });
      for (const property in series) {
        seriesList.push({
          target: property,
          datapoints: series[property].sort((a: any, b: any) => {
            return a[1] - b[1];
          }),
        });
      }
    }*/

    if (!seriesList) {
      seriesList = [];
    }
    return {
      data: seriesList,
    };
  }

  static getGrouppedResults(seriesList: [], groupMap: any) {
    const groupSeriesList: any = {};
    const seriesListOutput: any[] = [];

    seriesList.forEach((series: any) => {
      const jobId = series.jobId;
      const datapoints: [] = series.datapoints;
      let dashboardName: string = groupMap.dashboards[jobId];

      if (!dashboardName) {
        dashboardName = jobId;
      }
      if (!groupSeriesList[dashboardName]) {
        groupSeriesList[dashboardName] = [];
      }

      datapoints.forEach((data, index) => {
        if (!groupSeriesList[dashboardName][index] || groupSeriesList[dashboardName][index][0] < data[0]) {
          groupSeriesList[dashboardName][index] = data;
        }
      });
    });

    Object.keys(groupSeriesList).forEach((dashboard: string) => {
      seriesListOutput.push({
        target: dashboard,
        datapoints: groupSeriesList[dashboard],
      });
    });

    return seriesListOutput;
  }

  static mapToTextValue(result: any) {
    if (result.data && result.data.collections) {
      return result.data.collections.map((collection: string) => {
        return {
          text: collection,
          value: collection,
        };
      });
    }
    if (result.data && result.data.facet_counts) {
      const ar: any[] = [];
      for (const key in result.data.facet_counts.facet_fields) {
        if (!result.data.facet_counts.facet_fields.hasOwnProperty(key)) {
          continue;
        }

        const array = result.data.facet_counts.facet_fields[key];
        for (let i = 0; i < array.length; i += 2) {
          // take every second element
          if (
            array[i + 1] > 0 &&
            !ar.find(ele => {
              return ele.text === array[i];
            })
          ) {
            let text = array[i];
            const detectorPatternMatches = text.match(/\( Function: .* Field: (.*) \)/);
            if (detectorPatternMatches) {
              text = detectorPatternMatches[1];
            }

            if (text) {
              text = text
                .replace(/\"/g, '\\"')
                .replace(/{/g, '\\{')
                .replace(/}/g, '\\}');
            }
            ar.push({
              text: '"' + text + '"',
              expandable: false,
            });
          }
        }
      }
      return ar;
    }
    if (result.data) {
      return result.data
        .split('\n')[0]
        .split(',')
        .map((field: string) => {
          return {
            text: field,
            value: field,
          };
        });
    }
  }

  static getFirstAndLastNResults(data: any, pageSize: any) {
    let arr: any[] = [];
    if (data && data.data && data.data.response) {
      for (let i = 0; i < Math.round(data.data.response.numFound / Number(pageSize.query)); i++) {
        arr.push(i);
      }
    }
    arr = arr.map(ele => {
      return {
        text: ele + 1,
        value: ele,
      };
    });
    const firstNResults = arr.slice(0, 10);
    const lastNResults = arr.splice(arr.length - 11, arr.length - 1);

    if (firstNResults.length === 0 && lastNResults.length === 0) {
      return [
        {
          text: 0,
          value: 0,
        },
      ];
    }

    return firstNResults.concat(lastNResults);
  }

  static sortList(seriesList: any[], top?: number) {
    seriesList.sort((a: any, b: any) => {
      let totalA = 0;
      let totalB = 0;
      if (a.datapoints && b.datapoints) {
        a.datapoints.map((d: any) => {
          totalA += d[0];
        });
        b.datapoints.map((d: any) => {
          totalB += d[0];
        });
      } else {
        return 0;
      }

      return totalB - totalA;
      // return b.score - a.score;
    });

    if (top) {
      seriesList = seriesList.slice(0, top);
    }

    return seriesList;
  }

  static getSortedSeries(seriesToSort: any[], baselineSeries: any[], indvAnOutField: string): any[] {
    const resultSeries: any[] = [];
    const seriesSuffixes = indvAnOutField === 'all' ? [' actual', ' expected', ' score', ' anomaly'] : [' ' + indvAnOutField];
    baselineSeries.forEach(baselineSer => {
      const seriesName = baselineSer.target;
      seriesSuffixes.forEach(suffix => {
        resultSeries.push(
          seriesToSort.find(s => {
            return s.target === seriesName + suffix;
          })
        );
      });
    });

    return resultSeries;
  }

  static getStdDev(series: number[]) {
    const min = Math.min(...series);
    const max = Math.max(...series);

    series = series.map(b => {
      return (b - min) / (max - min);
    });

    return series;
  }

  static findCorrelation(x: any, y: any) {
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0,
      sumY2 = 0;
    const minLength = (x.length = y.length = Math.min(x.length, y.length)),
      reduce = (xi: any, idx: any) => {
        const yi = y[idx];
        sumX += xi;
        sumY += yi;
        sumXY += xi * yi;
        sumX2 += xi * xi;
        sumY2 += yi * yi;
      };
    x.forEach(reduce);
    return (minLength * sumXY - sumX * sumY) / Math.sqrt((minLength * sumX2 - sumX * sumX) * (minLength * sumY2 - sumY * sumY));
  }

  static queryBuilder(query: string) {
    return (
      query
        .replace(/{/g, '(') // (?<!(?:\\)){ Replace { not followed by \ with (. Reverting this part as negative lookbehind
        //pattern doesn't work in Safari  and Solr treats { and ( same.
        .replace(/}/g, ')') // Replace } not followed by \ with )
        .replace(/\",\"/g, '" OR "')
    );
  }
}

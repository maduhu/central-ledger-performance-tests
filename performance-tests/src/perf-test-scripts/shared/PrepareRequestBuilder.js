const shell = require('shelljs');
const fs = require('fs');
const unirest = require('unirest');
const uuidGen = require('uuid/v4');
const PrepareRequestBuilder = (requestTemplate) => {

  const execRequest = (ids, hostNameUrl, outputPath) => {
    const uuid = uuidGen();
    const requestBody = requestTemplate.create(hostNameUrl, uuid);
    const uri = `${hostNameUrl}/transfers/${uuid}`

    return new Promise((resolve, reject) => {
      unirest.put(uri)
      .headers({'Content-Type': 'application/json'})
      .send(requestBody)
      .end((response) => {
        if (response.code >= 200 && response.code < 300) {
          console.log(`Call Successful ${uri} ${response.code}`);
          fs.appendFileSync(ids, uuid + "\n");
          resolve();
        } else {
          if (response.code) {
            console.log(`PrepareRequestBuilder Call Failed ${uri} ${response.code}`);
            reject(`PrepareRequestBuilder Call Failed ${uri} ${response.code}`);
          } else {
            console.log(`PrepareRequestBuilder Call Failed ${uri}`);
            console.log(response);
          }
        }
      });
    });
  }

  const buildGroupsOfStaggeredExecutionPromises = (request, numberOfRequests, maxPacePerInterval = 50) => {
    const millisPerInterval = 1000;
    const numberOfGroups = Math.ceil(numberOfRequests/maxPacePerInterval);
    console.log(`For ${numberOfRequests} requests we create ${numberOfGroups} groups to keep pace at ${maxPacePerInterval} per ${millisPerInterval}ms`);
    let promiseForEachGroup = [];
    for (let gc = 1;gc <= numberOfGroups; gc++) {
      const promise = new Promise((resolve, reject) => {
        setTimeout(() => {
          const requests = [];
          for (let i = 0;i<maxPacePerInterval;i++) {
            requests.push(request());
          }
          Promise.all(requests).then(() => {
            console.log("Group " + gc + " Done.")
            resolve();
          });
        }, millisPerInterval * gc);
      });
      promiseForEachGroup.push(promise);
    }
    return promiseForEachGroup;
  }

  const build = (numberOfRequests, hostNameUrl, outputPath) => {
    let ids = `${outputPath}/ids.txt`;

    const request = () => execRequest(ids, hostNameUrl, outputPath);
    return buildGroupsOfStaggeredExecutionPromises(request, numberOfRequests);
  }

  return {build};
};

module.exports = PrepareRequestBuilder;

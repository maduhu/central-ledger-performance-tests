const shell = require('shelljs');
const fs = require('fs');
const uuidGen = require('uuid/v4');
const PerformanceTestRequestBuilder = (requestTemplate) => {

  const build = (rate, duration, hostNameUrl, outputPath) => {
    console.log(`Calling build with ${rate} ${duration} ${hostNameUrl} ${outputPath}`);
    let numberOfRequests = rate*duration;
    let targetsFile = `${outputPath}/targets.txt`;
    let bodiesPath = `${outputPath}/bodies`;
    shell.mkdir('-p', bodiesPath);

    for (let i=1; i<=numberOfRequests; i++) {
      let uuid = uuidGen();
      let requestBody = requestTemplate.create(
          hostNameUrl,
          uuid);
      let requestBodyPath = `${bodiesPath}/body${i}.json`;
      fs.appendFileSync(requestBodyPath, requestBody);

      let targetData = `PUT ${hostNameUrl}/transfers/${uuid}
@${requestBodyPath}
`
      fs.appendFileSync(targetsFile, targetData);
    }
  }
  return {build};

};

module.exports = PerformanceTestRequestBuilder;

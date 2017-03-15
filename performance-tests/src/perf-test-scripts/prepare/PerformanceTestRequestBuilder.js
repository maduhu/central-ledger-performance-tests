const PerformanceTestRequestBuilder = (shell, fs, uuidGen, requestTemplate) => {

  const build = (rate, duration, hostNameUrl, outputPath) => {
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

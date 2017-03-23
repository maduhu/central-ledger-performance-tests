const FulfillRequestBuilder = (shell, fs, idsFile) => {
  let data = fs.readFileSync(idsFile, 'utf8');
  const ids = data.split("\n");

  const getId = (lineIndex) => {
    return ids[lineIndex];
  };

  const build = (rate, duration, hostNameUrl, outputPath) => {
    let numberOfRequests = rate*duration;
    let targetsFile = `${outputPath}/targets.txt`;
    let bodiesPath = `${outputPath}/bodies`;
    shell.mkdir('-p', bodiesPath);

    for (let i=0; i<numberOfRequests; i++) {
      let uuid = getId(i);
      let requestBody = "oAKAAA";
      let requestBodyPath = `${bodiesPath}/body${i}.json`;
      fs.appendFileSync(requestBodyPath, requestBody);

      let targetData = `PUT ${hostNameUrl}/transfers/${uuid}/fulfillment
      Content-Type: text/plain
      @${requestBodyPath}
      `
      fs.appendFileSync(targetsFile, targetData);
    }
  }
  return {build};

};

module.exports = FulfillRequestBuilder;

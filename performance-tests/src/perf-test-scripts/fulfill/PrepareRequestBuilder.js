const PrepareRequestBuilder = (shell, fs, unirest, uuidGen, requestTemplate) => {
  let complete = false;

  const makeRequest = (ids, hostNameUrl, successes, failures, desiredSuccesses, maxFailures, completeCallback) => {
    const uuid = uuidGen();
    const requestBody = requestTemplate.create(hostNameUrl, uuid);
    const uri = `${hostNameUrl}/transfers/${uuid}`

    unirest.put(uri)
    .headers({'Content-Type': 'application/json'})
    .send(requestBody)
    .end((response) => {
      if (response.code >= 200 && response.code < 300) {
        console.log(`Call Successful ${uuid} ${response.code} Success Count: ${successes + 1}`);
        fs.appendFileSync(ids, uuid + "\n");
        let newCount = successes + 1;
        if (newCount < desiredSuccesses) {
          makeRequest(ids, hostNameUrl, newCount, failures, desiredSuccesses, maxFailures, completeCallback);
        } else {
          console.log("Hit desired successes: " + newCount + " vs " + desiredSuccesses)
          completeCallback(true);
        }
      } else {
        console.log(`Call Failed ${uuid} ${response.code}`)
        let newFailuresCount = failures + 1;
        if (newFailuresCount < maxFailures)
          makeRequest(ids, hostNameUrl, successes, newFailuresCount, desiredSuccesses, maxFailures, completeCallback);
        else {
          console.log("Hit maxFailures: " + newFailuresCount + " vs " + maxFailures);
          completeCallback(false);
        }
      }
    });
  }

  const build = (numberOfRequests, hostNameUrl, outputPath, completeCallback) => {
    let ids = `${outputPath}/ids.txt`;
    makeRequest(ids, hostNameUrl, 0, 0, numberOfRequests, 10, completeCallback);
  }

  return {build};

};

module.exports = PrepareRequestBuilder;

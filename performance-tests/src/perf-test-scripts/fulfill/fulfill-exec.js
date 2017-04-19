const FulFillRequestBuilder = require('../shared/FulfillRequestBuilder');

const run = (rate, duration, hostNameUrl, outputPath) => {
  const idsFile = `${outputPath}/ids.txt`;
  FulFillRequestBuilder(idsFile).build(rate, duration, hostNameUrl, outputPath);
};

module.exports = run;

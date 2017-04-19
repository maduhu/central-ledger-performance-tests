const PerformanceTestRequestBuilder = require('../shared/PerformanceTestRequestBuilder');
const PrepareRequestBodyTemplate = require('../shared/PrepareRequestBodyTemplate');

const run = (rate, duration, hostNameUrl, outputPath, setupConfig) => {
  console.log("Inside the prepare exec run");
  let templateFile = `shared/prepare-request.json.template`;

  let requestTemplate = PrepareRequestBodyTemplate(templateFile, setupConfig.accounts[0].name, setupConfig.accounts[1].name);

  let builder = PerformanceTestRequestBuilder(requestTemplate);
  builder.build(rate, duration, hostNameUrl, outputPath);
};

module.exports = run;

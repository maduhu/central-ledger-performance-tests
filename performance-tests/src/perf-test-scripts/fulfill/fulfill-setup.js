const PrepareRequestBuilder = require('../shared/PrepareRequestBuilder');
const PrepareRequestBodyTemplate = require('../shared/PrepareRequestBodyTemplate');
const createAccount = require('../shared/AccountCreator');

const run = (rate, duration, hostNameUrl, outputPath, setupConfig) => {
  console.log("fulfill-setup running.");
  let templateFile = `shared/prepare-request.json.template`
  let requestTemplate = PrepareRequestBodyTemplate(templateFile, setupConfig.accounts[0].name, setupConfig.accounts[1].name);
  let builder = PrepareRequestBuilder(requestTemplate);

  const promises = builder.build(rate * duration, hostNameUrl, outputPath);
  return Promise.all(promises);
};

module.exports = run;

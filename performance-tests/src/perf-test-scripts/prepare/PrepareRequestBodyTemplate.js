const PrepareRequestBodyTemplate = (fs, testName) => {
  let templateFile = `perf-test-scripts/${testName}/${testName}-exec.json.template`
  let reqTemplate = fs.readFileSync(templateFile, "utf8");

  const create = (hostNameUrl, uuid) => {
    reqTemplate = reqTemplate.replace(/<LEDGER_URL>/g, hostNameUrl);
    reqTemplate = reqTemplate.replace(/<TRANSFER_ID>/g, uuid);
    return reqTemplate;
  };
  return {create};
};

module.exports = PrepareRequestBodyTemplate;

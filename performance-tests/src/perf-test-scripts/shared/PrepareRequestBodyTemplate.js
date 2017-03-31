const PrepareRequestBodyTemplate = (fs, templateFile) => {
  let reqTemplate = fs.readFileSync(templateFile, "utf8");

  const create = (hostNameUrl, uuid) => {
    let content = reqTemplate.replace(/<LEDGER_URL>/g, hostNameUrl);
        content = content.replace(/<TRANSFER_ID>/g, uuid);
    return content;
  };
  return {create};
};

module.exports = PrepareRequestBodyTemplate;

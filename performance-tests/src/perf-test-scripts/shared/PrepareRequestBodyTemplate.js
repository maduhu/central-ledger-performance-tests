const fs = require('fs');
const PrepareRequestBodyTemplate = (templateFile, senderAccount = "TestDFSP1", receiverAccount = "TestDFSP2") => {
  let reqTemplate = fs.readFileSync(templateFile, "utf8");
  let baseTemplate = reqTemplate.replace(/<SENDER_ACCOUNT>/g, senderAccount);
      baseTemplate = baseTemplate.replace(/<RECEIVER_ACCOUNT>/g, receiverAccount);

  const create = (hostNameUrl, uuid) => {
    let content = baseTemplate.replace(/<LEDGER_URL>/g, hostNameUrl);
        content = content.replace(/<TRANSFER_ID>/g, uuid);
    return content;
  };
  return {create};
};

module.exports = PrepareRequestBodyTemplate;

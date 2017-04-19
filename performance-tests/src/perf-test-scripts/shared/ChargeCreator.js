const unirest = require('unirest');

const recordCreated = (responseCode) => {
  const created = responseCode >= 200 && responseCode <300;
  if (created) console.log("Charge record Created");
  return created;
};

const recordAlreadyCreated = (response) => {
  const alreadyCreated = response.code == 422 && response.raw_body.id == "RecordExistsError";
  if (alreadyCreated) console.log("Charge record already exists");
  return alreadyCreated;
};

const recordExists = (response) => {
  return recordCreated(response.code) || recordAlreadyCreated(response);
};

const buildRequestBody = (chargeName) => {
  return {
    name: chargeName,
    charge_type: "fee",
    rate_type: "percent",
    rate: "0.1",
    code: "001",
    is_active: true,
    payer: "receiver",
    payee: "ledger"
  }
};

const createPercentCharge = (adminUri, chargeName) => {
  return new Promise((resolve, reject) => {
    const createChargeUri = `${adminUri}/charges`;
    console.log("Create charge URI: " + createChargeUri);
    unirest.post(createChargeUri)
    .headers({'Content-Type': 'application/json'})
    .send(buildRequestBody(chargeName))
    .end((response) => {
      recordExists(response) ? resolve() : reject("Charge does not exist");
    });
  });
};

module.exports = createPercentCharge;

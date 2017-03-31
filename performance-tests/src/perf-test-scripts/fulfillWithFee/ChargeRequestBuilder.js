const ChargeRequestBuilder = (unirest, adminUri) => {

  const createChargeUri = `${adminUri}/charges`;
  const requestBody = {
    name: "BasicPercentFee",
    charge_type: "fee",
    rate_type: "percent",
    rate: "0.1",
    code: "001",
    is_active: true,
    payer: "receiver",
    payee: "ledger"
  }
  const build = (callback) => {
    unirest.post(createChargeUri)
    .headers({'Content-Type': 'application/json'})
    .send(requestBody)
    .end((response) => {
      console.log("Fee Created Response " + response.code);
      console.log(response);
      let recordExists = response.raw_body.id == "RecordExistsError";
      console.log("Record exists: " + recordExists)
      let completed = false;
      if (response.code >= 200 && response.code <300)
        completed = true;
      else if (response.code == 422 && recordExists)
        completed = true;
      callback(completed);
    });
  };

  return {build};

};

module.exports = ChargeRequestBuilder;

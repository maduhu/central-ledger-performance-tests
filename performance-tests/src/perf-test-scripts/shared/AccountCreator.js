const Unirest = require('unirest');

const create = ({hostNameUrl, name, password, callback}) => {
  return new Promise((resolve, reject) => {
    const uri = `${hostNameUrl}/accounts`;
    Unirest.post(uri)
      .headers({'Content-Type': 'application/json'})
      .send({
        "name": name,
        "password": password
      }).end((response) => {
        const recordExists = response.body && response.body.id == "RecordExistsError";
        if (response.code == 201 || (response.code == 422 && recordExists)) {
          console.log(response.body);
          resolve({name, password});
        } else {
          console.error(uri + " Bad response code: " + response.code);
          reject();
        }
      });
  });
}

module.exports = create;

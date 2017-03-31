import { assert } from 'chai';
import sinon from 'sinon';
import unirest from 'unirest';
import ChargeRequestBuilder from '../ChargeRequestBuilder';

const createChargeUri = "http://central-ledger-admin"
const requestBody = {
  name: "BasicPercentFee",
  charge_type: 'fee',
  rate_type: 'percent',
  rate: '0.1',
  code: "001",
  is_active: true,
  payer: "receiver",
  payee: "ledger"
}

describe('ChargeRequestBuilder', function() {
  describe('build', function() {
    it('should make a POST to the create charge endpoint in the ledger', function() {
      const request = {
        headers: () => {},
        send: () => {},
        end: () => {}
      }

      sinon.stub(unirest, 'post').returns(request);
      sinon.stub(request, 'headers').returns(request);
      sinon.stub(request, 'send').returns(request);

      ChargeRequestBuilder(unirest, createChargeUri).build();

      assert.isTrue(unirest.post.calledWith(createChargeUri+"/charges"));
      assert.isTrue(request.send.calledWith(requestBody));
    });
  });
});

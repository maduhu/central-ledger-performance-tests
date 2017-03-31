import { assert } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import PrepareRequestBodyTemplate from '../PrepareRequestBodyTemplate';

describe('PrepareRequestBodyTemplate', function() {
  describe('create', function() {
    it('should fill out template', function() {
      const expectedTemplateFile = "<LEDGER_URL><TRANSFER_ID>";
      var fsStub = sinon.stub(fs, 'readFileSync').returns(expectedTemplateFile);

      const testName = "somePath";
      const expectedFilePath = `perf-test-scripts/shared/${testName}-exec.json.template`;

      const templateBuilder = PrepareRequestBodyTemplate(fs, expectedFilePath);
      const result = templateBuilder.create("a", "b");
      const result2 = templateBuilder.create("c", "d");

      assert.isTrue(fs.readFileSync.calledWith(expectedFilePath, "utf8"));
      sinon.assert.callCount(fsStub, 1);
      assert.equal(result, "ab");
      assert.equal(result2, "cd");
    });
  });
});

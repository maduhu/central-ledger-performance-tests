import { assert } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import shell from 'shelljs';
import PerformanceTestRequestBuilder from '../PerformanceTestRequestBuilder';

describe('PerformanceTestRequestBuilder', function() {
  describe('build', function() {
    it('should build targets file and a folder with request body files', function() {
      const expectedTemplateFile = "<LEDGER_URL><TRANSFER_ID>";
      let fsStub = sinon.stub(fs, 'appendFileSync');
      sinon.stub(shell, 'mkdir');
      let uuidGen = (() => {
        let n = 0;
        return () => {
          n += 1;
          return n;
        }
      })();

       let testName = "someTest";
       let rate = 1;
       let duration = 2;
       let hostNameUrl = "url";
       let runPath = "runPath";
       let outputPath = "outputPath"

       let requestTemplate = {
          create: (hostNameUrl, uuid) => {
            return hostNameUrl + uuid;
          }
       }

      PerformanceTestRequestBuilder(shell, fs, uuidGen, requestTemplate).build(
        rate, duration, hostNameUrl, outputPath
      );

      const requestBodyPath = "outputPath/bodies"
      const assertForIteration = (i) => {
          const expectedTargetData = `PUT ${hostNameUrl}/transfers/${i}
@${requestBodyPath}/body${i}.json
`
          assert.isTrue(fs.appendFileSync.calledWith(
            requestBodyPath + `/body${i}.json`,
            hostNameUrl + i
          ));
          assert.isTrue(fs.appendFileSync.calledWith(
            outputPath + "/targets.txt",
            expectedTargetData
          ));
      };

      assert.isTrue(shell.mkdir.calledWith('-p', requestBodyPath));
      assertForIteration(1);
      assertForIteration(2);
      sinon.assert.callCount(fsStub, rate * duration * 2);
    });
  });
});

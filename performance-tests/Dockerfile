FROM mhart/alpine-node:6.5.0

WORKDIR /opt/central-ledger-performance-tests/perf-test-scripts
COPY src/ /opt/central-ledger-performance-tests/

RUN apk add --no-cache curl ca-certificates util-linux bash tar openssl && \
  mkdir -p /tmp/build && \
  cd /tmp/build && \
  wget http://github.com/tsenart/vegeta/releases/download/v6.1.1/vegeta-v6.1.1-linux-amd64.tar.gz && \
  tar xf vegeta-v6.1.1-linux-amd64.tar.gz -C /usr/local/bin && \
  chmod +x /usr/local/bin/vegeta && \
  chmod -R +x /opt/central-ledger-performance-tests && \
  cd /opt/central-ledger-performance-tests && \
  npm install

ENTRYPOINT ["/opt/central-ledger-performance-tests/perf-test-scripts/performance-test-run.js"]
CMD "Hello World2"

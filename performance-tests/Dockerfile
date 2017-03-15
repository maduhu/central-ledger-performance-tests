FROM mhart/alpine-node:6.5.0
#FROM alpine:3.5

WORKDIR /opt/central-ledger-performance-tests
COPY src/ /opt/central-ledger-performance-tests/

RUN apk add --no-cache curl ca-certificates util-linux bash tar openssl && \
  mkdir -p /tmp/build && \
  cd /tmp/build && \
  wget http://github.com/tsenart/vegeta/releases/download/v6.1.1/vegeta-v6.1.1-linux-amd64.tar.gz && \
  tar xf vegeta-v6.1.1-linux-amd64.tar.gz -C /usr/local/bin && \
  chmod +x /usr/local/bin/vegeta && \
  chmod +x /opt/central-ledger-performance-tests/run.sh && \
  chmod -R +x /opt/central-ledger-performance-tests/perf-test-scripts && \
  ls -la /opt/central-ledger-performance-tests/* && \
  cd /opt/central-ledger-performance-tests && \
  npm install

ENTRYPOINT ["/opt/central-ledger-performance-tests/run.sh"]
CMD "Hello World2"

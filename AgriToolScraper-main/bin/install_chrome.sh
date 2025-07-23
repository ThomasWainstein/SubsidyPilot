#!/bin/bash
set -e

CHROME_VERSION=138.0.7204.168
BASE_URL="https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/linux64"
CHROME_ZIP="chrome-linux64.zip"
CHROMEDRIVER_ZIP="chromedriver-linux64.zip"

mkdir -p bin

# Download and extract Chrome
curl -L "${BASE_URL}/${CHROME_ZIP}" -o bin/${CHROME_ZIP}
unzip -o bin/${CHROME_ZIP} -d bin/
rm -rf bin/${CHROME_ZIP}

# Download and extract Chromedriver
curl -L "${BASE_URL}/${CHROMEDRIVER_ZIP}" -o bin/${CHROMEDRIVER_ZIP}
unzip -o bin/${CHROMEDRIVER_ZIP} -d bin/
rm -rf bin/${CHROMEDRIVER_ZIP}

chmod +x bin/chrome-linux64/chrome bin/chromedriver-linux64/chromedriver

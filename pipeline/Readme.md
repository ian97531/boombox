# Boombox Pipeline
---
A  series of Lambda functions that periodically check podcast RSS feeds, downloads any new episodes, and transcribes and preps the episode to be used by the front-end app.

## Development Setup
---
1. Checkout this repository to your machine:
 ```git clone https://github.com/ian97531/boombox.git```
2. Open your terminal and cd the pipeline directory in the repo.
3. Install the [Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/quick-start/):
```npm install -g serverless```
4. Install the node dependencies:
```npm install```
5. Obtain an AWS access key and secret from Ian.  Use these credentials to set up your local Serverless credentials ([link](https://serverless.com/framework/docs/providers/aws/guide/credentials/)):
```serverless config credentials --provider aws --key [ACCESS KEY] --secret [SECRET]```
6. Install Homebrew:
```/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"```
7. Update your PATH in  `~/.profile` to include Homebrew’s bin directory by adding the line:
```export PATH="/usr/local/bin:/usr/local/sbin:$PATH"```
8. Install python 2.7:
```brew install python@2```
9. Install the python requirements for the pipeline:
```pip install -r ./requirements.txt```
10. Do a test deploy:
```sls deploy```

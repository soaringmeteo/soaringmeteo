# SoaringMeteo — Frontend

Frontend that consumes the JSON files produced by the backend.

## Build Requirements

Make sure the yarn command is available

## Setup

Run the following command once to download the project dependencies:

~~~
yarn install
~~~

## Build

Run the following command:

~~~
yarn build
~~~

It will produce the production assets into the `dist/` directory.

## Develop

First, generate meteorological assets by running the backend (see [here](../backend/CONTRIBUTING.md)).

You need to run `yarn install` again each time the dependencies change.

Then, run the following command to start a web server showing the application:

~~~
yarn start
~~~

It should open a web browser at the URL http://0.0.0.0:3000.

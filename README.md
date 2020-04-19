# makeGFSJson

Like `makeGFSJs`, but produces JSON documents instead of JavaScript
files.

## Requirements

Running the program requires a Java Runtime Environment (at least
version 8).

Building the program requires a JDK and sbt.

## Deploy

Run the following command from within this directory
(`soaringmeteo/src/makeGFSJson`):

~~~
sbt deploy
~~~

It should create an executable named `makeGFSJson` in the
`soaringmeteo/gfs` directory.

## Develop

First, invoke the command `sbt` from within this directory:

~~~
sbt
~~~

From the prompt, invoke the following command to download
the latest grib files from NOAA.

~~~
downloadGribFiles
~~~

Then, invoke the following command to transform the
grib files into JSON files that can be consumed by the frontend:

~~~
makeGfsJson
~~~

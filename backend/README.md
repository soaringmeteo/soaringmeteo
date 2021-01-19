# soaringmeteo

Produces JSON documents containing relevant GFS data for soaring.

## Requirements

Running the program requires a Java Runtime Environment (at least
version 8).

Building the program requires a JDK and sbt.

## Build

~~~
sbt universal:packageZipTarball
~~~

It should create a tarball named `backend-0.1.0-SNAPSHOT.tgz` in the
`target/universal/` directory.

## Develop

First, invoke the command `sbt` from within this directory:

~~~
sbt
~~~

From the prompt, invoke the following command to download
the latest grib files from NOAA, and transform them into JSON
files that can be consumed by the frontend:

~~~
downloadGribAndMakeJson
~~~

# SoaringMeteo — Backend

Produces JSON documents containing relevant GFS data for soaring.

## Requirements

Running the program requires a Java Runtime Environment (at least
version 8).

Building the program requires a JDK and sbt.

## Build

~~~
sbt universal:packageZipTarball
~~~

It should create a tarball named `soaringmeteo-0.1.0-SNAPSHOT.tgz` in the
`target/universal/` directory.

## Run

Unpack the archive `soaringmeteo-0.1.0-SNAPSHOT.tgz` and run the binaries in the `bin` directory:

~~~
bin/soaringmeteo <CSV locations file> <GRIBs directory> <JSON directory>
~~~

The program takes three required arguments:

1. the location of the CSV file that contains the GFS points for which we want to produce a soaring forecast,
2. the directory where to store the GRIB files downloaded from GFS,
3. the directory where to write the produced JSON files.

Optional flags and arguments are documented with `--help`:

~~~
bin/soaringmeteo --help
~~~

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

Look at the file [reference.conf](src/main/resources/reference.conf) for the configuration options.

# SoaringMeteo — Backend

Produces JSON documents containing relevant GFS data for soaring.

## Requirements

Running the program requires a Java Runtime Environment (at least
version 8).

Building the program requires a JDK and sbt.

## Build

~~~
sbt Universal/packageZipTarball
~~~

It should create a tarball named `soaringmeteo-0.1.0-SNAPSHOT.tgz` in the
`target/universal/` directory.

## Run

Unpack the archive `soaringmeteo-0.1.0-SNAPSHOT.tgz` and run the binaries in the `bin` directory:

~~~
bin/soaringmeteo <GRIBs directory> <JSON directory>
~~~

The program takes two required arguments:

1. the directory where to store the GRIB files downloaded from GFS,
2. the directory where to write the produced JSON files.

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

This command downloads a subset of the usual data to speed up the development workflow.

You can customize the settings by changing the configuration file [dev.conf](dev.conf). Look at the file [reference.conf](src/main/resources/reference.conf) for an overview of all the configuration options.

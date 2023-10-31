# SoaringMeteo — Backend

Produces raster images, vector tiles, and JSON documents containing relevant meteorological data for soaring pilots from the results of the GFS and WRF models.

## Requirements

Running the program requires a Java Runtime Environment (at least
version 11).

Building the program requires a JDK and [sbt](https://scala-sbt.org).

## Overview

The backend part is made of two distinct programs, `gfs` and `wrf`, which process data from the GFS and WRF models, respectively.

## Build

Start the `sbt` shell in the project root directory:

~~~ sh
sbt
~~~

Then, run the following command to build the `gfs` program:

~~~
gfs/Universal/packageZipTarball
~~~

Or, to build the `wrf` program:

~~~
wrf/Universal/packageZipTarball
~~~

It should create a tarball named `soaringmeteo-gfs.tgz` or `soaringmeteo-wrf.tgz` in the
`target/universal/` directory of the corresponding subproject.

## Run

### GFS Pipeline

Unpack the archive `gfs.tgz` created at the “Build” step above, and run the binaries located in the `bin` directory:

~~~
tar -xzf soaringmeteo-gfs.tgz
cd soaringmeteo-gfs/
bin/gfs <GRIBs directory> <output directory>
~~~

The program takes two required arguments:

1. the directory where to store the GRIB files downloaded from GFS,
2. the directory where to write the produced assets (consumed by the frontend).

Optional flags and arguments are documented with `--help`:

~~~
bin/gfs --help
~~~

## Develop

See [CONTRIBUTING.md](CONTRIBUTING.md).

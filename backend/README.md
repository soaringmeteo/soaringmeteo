# SoaringMeteo — Backend

Produces raster images, vector tiles, and JSON documents containing relevant meteorological data for soaring pilots from the results of the GFS and WRF models.

# Setup

The setup procedure is detailed in [CONTRIBUTING.md](../CONTRIBUTING.md).

# GFS program

~~~
bin/gfs <GRIBs directory> <output directory>
~~~

The program takes two required arguments:

1. the directory where to store the GRIB files downloaded from GFS,
2. the directory where to write the produced assets (consumed by the frontend).

Optional flags and arguments are documented with `--help`:

~~~
bin/gfs --help

Usage: soaringmeteo-gfs [--gfs-run-init-time <string>] [--reuse-previous-grib-files] <GRIBs directory> <output directory>

Download weather data from the GFS model, extract the relevant information for soaring pilots, and produce meteorological assets from it

Options and flags:
    --help
        Display this help text.
    --gfs-run-init-time <string>, -t <string>
        Initialization time of the GFS forecast to download ('00', '06', '12', or '18').
    --reuse-previous-grib-files, -r
        Reuse the previously downloaded GRIB files instead of downloading them again.
~~~

# WRF program

~~~
bin/wrf <output directory> <run initialization time> <time of the forecast first time-step> <input files>...
~~~

The program takes the following arguments:

- the directory where to write the produced assets (consumed by the frontend),
- the initialization time of the WRF run (e.g. “2023-11-21T12:00Z”),
- the time of the forecast first time-step (e.g. “2023-11-23T06:00Z”),
- the `.nc` files produced by the WRF run.

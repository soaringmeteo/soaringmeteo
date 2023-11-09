# Contributing

Start the `sbt` shell in the project root directory:

~~~ sh
sbt
~~~

The project contains three subprojects:

- `gfs`, the GFS pipeline
- `wrf`, the WRF pipeline
- `common`, common parts (e.g., GRIB extraction, etc.)

## sbt Commands Cheat Sheet

Run all the commands below from the sbt prompt.

Compile all the subprojects:

~~~ sbt
compile
~~~

Compile one subproject by writing its name followed by `/compile`:

~~~ sbt
gfs/compile
wrf/compile
common/compile
~~~

Run all the tests of all the subprojects:

~~~ sbt
test
~~~

Run the tests of one subproject by writing its name followed by `/test`:

~~~ sbt
gfs/test
wrf/test
common/test
~~~

## Run the GFS Pipeline Locally

From the sbt prompt, invoke the following command to download
the latest grib files from NOAA, and transform them into
assets that can be consumed by the frontend:

~~~
makeGfsAssets
~~~

This command downloads a subset of the usual data to speed up the development workflow.

You can customize the settings by changing the configuration file [dev.conf](gfs/dev.conf). Look at the file [reference.conf](gfs/src/main/resources/reference.conf) for an overview of all the configuration options.

## Run the WRF Pipeline Locally

Before running the command, you need to fetch `.nc` files produced by the WRF model. Ask help from the maintainers.

~~~
makeWrfAssets
~~~

## Deployment

Deploy the content of your working directory by running the sbt task `deploy` in the project `gfs` or `wrf`:

~~~
gfs/deploy
wrf/deploy
~~~

The task packages the app, uploads it to the server `soarwrf1.soaringmeteo.org`, and replaces the previous version of the app.

# How to contribute

Soaringmeteo team is glad you are reading this, because we always need volunteers
to keep this service up to date.

* Find a bug? Do not hesitate to open an issue using the [bug template](../../issues/new?template=bug-report.md).
* Have an awesome improvement idea? Do not hesitate to open an issue using the [feature template](../../issues/new?template=feature_request.md).

# Setup the development environment

The following steps assumes that you are running a debian based OS, and has been tested under Ubuntu 20.04 LTS.

## Tools install for the  backend

You need to install a JDK 17 (such as [OpenJDK](https://openjdk.org/)) and the build tool [sbt](https://scala-sbt.org).

1. java

```bash
sudo apt install openjdk-17-jre
sudo apt install openjdk-17-jdk
# to confirm
java --version
```

2. sbt

```bash
echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
echo "deb https://repo.scala-sbt.org/scalasbt/debian /" | sudo tee /etc/apt/sources.list.d/sbt_old.list
curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | sudo apt-key add
sudo apt update
sudo apt install sbt
```

More information is available on the [sbt website](https://scala-sbt.org).

## Tools install for the  frontend

1. yarn 3 (instructions taken from the [Yarn website](https://yarnpkg.com/getting-started/install)
```bash
corepack enable
yarn set version 3
yarn --version
```

2. node 18 (managed through  nvm)
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

nvm install 18
```

# Build and run the backend

The backend programs `gfs` and `wrf` must be built and run to create the assets consumed by the frontend.

1. Move to backend directory 
```bash
cd backend
```
2. Start the sbt shell 
```
sbt
```

3. Run the `gfs` and the `wrf` programs:

  * Put the `.nc` files given by the project maintainer in the `backend` folder.
  
  * Run all the necessary steps and generate the assets (in the `sbt` console in the `backend` folder)

	```
	makeGfsAssets
	makeWrfAssets
	```
	
`makeGfsAssets` downloads a subset of the usual data to speed up the development workflow.

You can customize the settings by changing the configuration file [dev.conf](gfs/dev.conf). Look at the file [reference.conf](gfs/src/main/resources/reference.conf) for an overview of all the configuration options.

The different backend options are documented [here](backend/README.md)

# Run the frontend

Move to the  `frontend` folder and run:

```
yarn install --immutable
yarn build
yarn start
```

Open a browser to the address suggested in your console (by default `127.0.0.1:3000`).
Congratulations! Your development environment is ready.

# Test the code

## Backend

Open a console in the `backend` folder and run the `sbt` tool to get a `sbt` console.
The following command runs all the available tests:

~~~ sbt
test
~~~

## Frontend

No testing procedure yet.



# Submit your changes

Please open a pull request with a clear and detailed list of the modification you have made.
Please use one commit per modification and add a clear message.

# sbt Commands Cheat Sheet

Run the following commands from the sbt shell (started in the `backend` directory).

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

Build binaries:

~~~
gfs/Universal/packageZipTarball
~~~

Or, to build the `wrf` program:

~~~
wrf/Universal/packageZipTarball
~~~

It should create a tarball named `soaringmeteo-gfs.tgz` or `soaringmeteo-wrf.tgz` in the `target/universal/` directory of the corresponding subproject. Then, extract the content of the archive from your *nix shell:

~~~
tar -xzf soaringmeteo-gfs.tgz
~~~

# Deployment on soaringmeteo servers (project maintainers only)

## Deploy the backend

From the sbt shell (started in the `backend` directory), deploy the content of your working directory by running the task `deploy` in the project `gfs` or `wrf`:

~~~
gfs/deploy
wrf/deploy
~~~

The task packages the app, uploads it to the server `soarwrf1.soaringmeteo.org`, and replaces the previous version of the app.

## Deploy the frontend

In the `frontend` directory, run the following command:

~~~
yarn deploy
~~~

It type-checks the code source, build minified JavaScript bundles, and uploads them to the production server: https://soarwrf1.soaringmeteo.org/v2.

# Evolving the Format of the Forecast Data

The frontend consumes the forecast data produced by the backend, so both parties need to agree on their format.
Furthermore, the frontend also reads several forecast data in the past (users can show the data from the latest
forecast run, or from older runs as well). This has consequences on how the format of the forecast data produced
by the backend can evolve:

- We can add or remove optional fields,
- We can remove non-optional fields (the frontend will simply ignore those fields on the older forecast data).

However, to add non-optional fields we have to perform the following procedure:

- Bump the format version both in the backend and the frontend
	- `backend/common/src/main/scala/org/soaringmeteo/out/package.scala`
	- `frontend/src/data/ForecastMetadata.ts`
- Perform a two-stage deployment
	1. Deploy the backend,
	2. Only after the backend has produced some data, we can deploy the frontend (in the meantime, the frontend
	   still shows the older forecast data).

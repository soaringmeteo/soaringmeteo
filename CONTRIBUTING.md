# How to contribute

Soaringmeteo team is glad you are reading this, because we always need volunteers
to keep this awesome service up to date.

* Find a bug? Do not hesitate to open an issue using the [bug template](../../issues/new?assignees=&labels=bug&projects=&template=bug-report.md&title=BUG).
* Have an awesome improvement idea? Do not hesitate to open an issue using the [feature template](../../issues/new?assignees=&labels=&projects=&template=feature_request.md&title=).

# Evolving the Format of the Forecast Data

The frontend consumes the forecast data produced by the backend, so both parties need to agree on their format. Furthermore, the frontend also reads several forecast data in the past (users can show the data from the latest forecast run, or from older runs as well). This has consequences on how the format of the forecast data produced by the backend can evolve:

    We can add or remove optional fields,
    We can remove non-optional fields (the frontend will simply ignore those fields on the older forecast data).

However, to add non-optional fields we have to perform the following procedure:

    Bump the format version both in the backend and the frontend
        backend/common/src/main/scala/org/soaringmeteo/out/package.scala
        frontend/src/data/ForecastMetadata.ts
    Perform a two-stage deployment
        Deploy the backend,
        Only after the backend has produced some data, we can deploy the frontend (in the meantime, the frontend still shows the older forecast data).


# Setup the development environment

The following steps assumes that you are running a debian based OS, and has been tested under Ubuntu 20.04 LTS.

## Tools install for the  backend

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

More informations are available on the [scala website](https://scala-sbt.org).

## Tools install for the  frontend

1. yarn3 (instructions taken from the [yarnpkg website](https://yarnpkg.com/getting-started/install)
```bash
corepack enable
yarn set version 3
yarn --version
```

2. node18 (managed through  nvm)
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

nvm install 18
```

## Build and run the backend

The backend `gfs` and `wrf` must be build and run to prepare the assets consumed by the frontend.

1. Move to backend directory 
```bash
cd backend
```
2. Start sbt server 
```
sbt
```

3. Run the `gfs` and the `wrf` program:

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

# Deployment on soaringmeteo servers (project maintainers only)

## Deploy the backend

Deploy the content of your working directory by running the sbt task `deploy` in the project `gfs` or `wrf`:

~~~
gfs/deploy
wrf/deploy
~~~

The task packages the app, uploads it to the server `soarwrf1.soaringmeteo.org`, and replaces the previous version of the app.


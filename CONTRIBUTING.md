# How to contribute

Soaringmeteo team is glad you are reading this, because we always need volunteers
to keep this awesome service up to date.

* Find a bug? Do not hesitate to open an issue using the bug template. **TODO: LINK HERE**
* Have an awesome improvement idea? Do not hesitate to open an issue using the feature template **TODO: LINK HERE**

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

More informations are available [here](https://scala-sbt.org).

## Tools install for the  frontend

1. yarn3 (instructions taken from [here](https://yarnpkg.com/getting-started/install)
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
3. Build the `gfs` program: 

```
gfs/Universal/packageZipTarball
tar -xzf soaringmeteo-gfs.tgz
```

4. Build the `wrf` program:

```
wrf/Universal/packageZipTarball
tar -xzf soaringmeteo-wrf.tgz
```

5. Run the `gfs` and the `wrf` program:

  * Put the `.nc` files given by the project maintainer in the `backend` folder.
  
  * Generate the assets (in the `sbt` console in the `backend` folder)

	```
	makeGfsAssets
	makeWrfAssets
	```

The different backend options are documented [here](backend/README.md)

# Run the frontend

```
yarn install --immutable
yarn build
yarn start
```

Open a browser to the address suggested in your console (by default `127.0.0.1:3000`).
Congratulations! Your development environment is ready.

# Test the code

## Backend

Open a console in the `backend folder` and run the `sbt` tool to get a `sbt` console.
The following commands run all the available tests:

~~~ sbt
test
~~~

**TODO insert typical output here** 

## Frontend

No tests yet.


# Coding conventions

**TODO: FILL THIS SECTION**


# Submit your changes

Please open a pull request with a clear and detailed list of the modification you have made.
Please use one commit per modification and add a clear message.


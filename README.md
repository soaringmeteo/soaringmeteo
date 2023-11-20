# SoaringMeteo

https://soaringmeteo.org is a weather forecast website for soaring
pilots.

This repository contains the implementation of the new version of
the website.

![](images/soaringmeteo.png)

# Architecture

On the one hand, SoaringMeteo produces weather forecast data
relevant for soaring pilots. This data is produced either by
extracting it from third-party sources such as [GFS], or by running
the [WRF] model on our own servers.

On the other hand, this forecast data is displayed on the website
https://soaringmeteo.org.

This repository contains two sub-projects:

- [backend](backend/), which produces the forecast data,
- [frontend](frontend/), which displays the forecast data.


The backend part is made of three distinct programs:

- `gfs`, the GFS pipeline, which process data from the GFS model
- `wrf`, the WRF pipeline, which process data from the WRF model
- `common`, common parts (e.g., GRIB extraction, etc.)

Please refer to each sub-project for more details.

# Contributing

Pull requests are welcome. See the [CONTRIBUTING.md](CONTRIBUTING.md) file for more details.

# Usage

Go to https://soarwrf1.soaringmeteo.org/v2.

# License

[GPL-3.0-or-later]

[GFS]: https://www.ncdc.noaa.gov/data-access/model-data/model-datasets/global-forcast-system-gfs
[WRF]: https://www2.mmm.ucar.edu/wrf/users/
[open issues]: https://github.com/soaringmeteo/soaringmeteo/issues
[GPL-3.0-or-later]: https://choosealicense.com/licenses/gpl-3.0/

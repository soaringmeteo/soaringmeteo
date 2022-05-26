# SoaringMeteo

https://soaringmeteo.org is a weather forecast website for soaring
pilots.

This repository contains the implementation of the new version of
the website.

![](images/soaringmeteo.png)

## Architecture

On the one hand, SoaringMeteo produces weather forecast data
relevant for soaring pilots. This data is produced either by
extracting it from third-party sources such as [GFS], or by running
the [WRF] model on our own servers.

On the other hand, this forecast data is displayed on the website
https://soaringmeteo.org.

This repository contains two sub-projects:

- [backend](backend/), which produces the forecast data,
- [frontend](frontend/), which displays the forecast data.

Please refer to each sub-project for more details.

## Contributing

Pull requests are welcome. See the [open issues].

## Usage

Go to https://soarwrf1.soaringmeteo.org/v2.

![](images/overview.png)

Select a forecast period at the top of the window:

![](images/controls-period.png)

The first row shows days, and the second row shows hours in the days.

Alternatively, change the forecast period by clicking on the buttons at the bottom of the window:

![](images/controls-period2.png)

### Map

At the bottom-right of the window, move the mouse pointer over the layers icon to select the information to display:

![](images/controls-layers.png)

![](images/controls-layers-meteogram.png)

The “Detailed View” part is explained below. The “Initialization Time” part allows you to switch to a different run of the forecast, which can be useful to compare how the forecast evolved over time for a specific location and time. The “Layer” part allows you to select what to display over the map.

The “None” overlay just displays the map.

The “Mixed” overlay is explained further below.

The “XC Flying Potentials” overlay (enabled by default) shows the potential of the area for XC flying:

![](images/controls-layers-thq.png)

We compute the XC potential by taking into account the boundary layer depth, the thermals velocity (based on insolation), and the average wind speed within the boundary layer. This produces a value between 0% and 100%. Deep boundary layer and fast thermals increase this value, and wind speeds higher than 15 km/h decrease this value.

We use the following color scale (100% means a high chance of XC flying):

![](images/key-thq.png)

We also show the wind speed and direction within the boundary layer on every location (see below for interpreting the barbells).

The “Boundary Layer Depth” overlay shows the boundary layer depth:

![](images/controls-layers-bld.png)

It uses the folowing color scale:

![](images/key-bld.png)

The “Thermal Velocity” overlay shows the estimated velocity of thermal updrafts:

![](images/controls-layers-thermal-velocity.png)

The thermal velocity is computed from the boundary layer depth and the sensible heat net flux.
It uses the following color scale:

![](images/key-thermal-velocity.png)

The “Wind” overlays show the wind speed and direction at various elevation levels:

![](images/controls-layers-wind.png)

The wind flows in the direction of the arrows, and the number and length of barbells model the wind speed:

![](images/key-wind.png)

The “Cloud Cover” overlay shows the total cloud cover:

![](images/controls-layers-cc.png)

The darker the dots, the more important the cloud cover is:

![](images/key-cc.png)

The “Convective Clouds” overlay shows the depth of the convective clouds (cumuli):

![](images/controls-layers-cumuli.png)

No convective clouds means blue thermals, and high convective clouds means a risk of thunderstorm.
It uses the following color scale:

![](images/key-cumuli.png)

The “Rain” overlay shows the amount of rainfalls:

![](images/controls-layers-rain.png)

The more opaque, the more rainfalls:

![](images/key-rain.png)

The “Mixed” overlay combines three layers: the boundary layer depth, the boundary layer wind, and the cloud cover:

![](images/controls-layers-mixed.png)

It uses the same color scales as the individual overlays:

![](images/key-bld.png) ![](images/key-wind.png) ![](images/key-cc.png)

Look for areas that are white (high boundary layer depth), with a thin wind arrow (little wind), and no dark points (clear sky).

### Meteograms

By clicking on a specific point on the map, you will see a detailed view for this location. You can display either a meteogram, or a sounding.

The meteogram shows the weather forecast for this location, over time:

![](images/meteogram.png)

The first row shows the “XC flying potential” indicator at this location, for each time period.

Then, there are two diagrams. The first one shows the boundary layer height (green columns, scale on the left in meters), the wind speed and direction and the cloud cover at several elevation levels. The red line shows the atmospheric pressure (scale on the right in hPa), and the black line shows the zero degree isotherm.

The bottom diagram shows rainfalls (blue bars and cyan bars, scale on the left in millimeters). The red line shows the air temperature at the ground level (scale on the right in Celsius degrees), and the blue line shows the dew point temperature.

### Soundings

Soundings show the air temperature lapse rate at the given location, for the selected forecast period:

![](images/sounding.png)

The black line shows the evolution of the temperature (horizontal axis) of the air with altitude (vertical axis). A thin line means a stable air mass. The thicker the line, the more unstable the air mass is.

The blue line shows the evolution of the dew point temperature with altitude.

The green area shows the boundary layer height. The white or gray areas show the presence of clouds.

On the left, the wind speed and direction is shown at various altitude levels by the wind barbells.

## License

[GPL-3.0-or-later]

[GFS]: https://www.ncdc.noaa.gov/data-access/model-data/model-datasets/global-forcast-system-gfs
[WRF]: https://www2.mmm.ucar.edu/wrf/users/
[open issues]: https://github.com/soaringmeteo/soaringmeteo/issues
[GPL-3.0-or-later]: https://choosealicense.com/licenses/gpl-3.0/

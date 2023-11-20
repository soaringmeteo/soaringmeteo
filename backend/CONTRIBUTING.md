# sbt Commands Cheat Sheet

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


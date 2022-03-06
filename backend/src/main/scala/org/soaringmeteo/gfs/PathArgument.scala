package org.soaringmeteo.gfs

import cats.data.{Validated, ValidatedNel}
import com.monovore.decline.Argument
import os.Path

import scala.util.{Failure, Success, Try}

object PathArgument {

  implicit val pathArgument: Argument[os.Path] = new Argument[Path] {
    def read(string: String): ValidatedNel[String, Path] =
      Try(os.Path(string, os.pwd)) match {
        case Failure(exception) => Validated.invalidNel(exception.toString)
        case Success(path)      => Validated.valid(path)
      }
    def defaultMetavar: String = "value"
  }

}

package org.soaringmeteo.build

import com.typesafe.sbt.packager.Keys.packageName
import com.typesafe.sbt.packager.archetypes.JavaAppPackaging
import com.typesafe.sbt.packager.universal.UniversalPlugin.autoImport.{Universal, packageZipTarball}
import sbt.*
import sbt.Keys.{ name, streams }
import sbt.internal.util.complete.Parser

import scala.sys.process.Process

object Deploy extends AutoPlugin {

  override def trigger = allRequirements
  override def requires = JavaAppPackaging

  object autoImport {
    val deploy = inputKey[Unit]("Deploy the application to the server")
  }

  // Instances
  val v2 = "v2"
  val v2Dev = "v2-dev"

  private val instanceParser: Parser[String] = {
    import sbt.complete.DefaultParsers.*
    Space ~> (literal(v2) | literal(v2Dev))
  }

  override lazy val projectSettings: Seq[Def.Setting[?]] = Seq(
    autoImport.deploy := {
      val instance = instanceParser.parsed

      val sbtOut = streams.value.log
      val appName = (Universal / packageName).value
      val appDir = name.value

      // Get the application tarball
      val appTarball = (Universal / packageZipTarball).value

      // Put it in an archive along with an update script
      IO.withTemporaryDirectory { tmp =>
        IO.write(
          tmp / "update.sh",
          s"""#!/usr/bin/env sh
            |set -e
            |
            |cd "/home/julienrf/${instance}/${appDir}"
            |rm -rf "${appName}.backup"
            |mv "${appName}" "${appName}.backup"
            |tar -xzf "$$(dirname "$$0")/${appTarball.name}"
            |""".stripMargin
        )
        IO.chmod("r-xr-xr-x", tmp / "update.sh")
        IO.copyFile(appTarball, tmp / appTarball.name)
        val makeArchiveCmd = Process(Seq(
          "tar",
          "-C",
          tmp.absolutePath,
          "-cf",
          "-",
          "."
        ))

        // Deploy
        val sshCmd = Process(Seq(
          "ssh",
          "julienrf@soarwrf1.soaringmeteo.org",
          "D=`mktemp -d`; tar xf - --directory=$D; $D/update.sh"
        ))
        ((makeArchiveCmd #| sshCmd) ! sbtOut).ensuring(_ == 0)
      }
    }
  )

}

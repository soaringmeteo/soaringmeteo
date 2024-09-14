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
  val soarwrf1 = "soarwrf1"
  val soarwrf3 = "soarwrf3"
  val soarwrf4 = "soarwrf4"

  private val instanceParser: Parser[String] = {
    import sbt.complete.DefaultParsers.*
    Space ~> (literal(soarwrf1) | literal(soarwrf3) | literal(soarwrf4))
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
            |echo "Updating the application ${appName}..."
            |cd "/home/soarv2/${appDir}"
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
        sbtOut.info("Uploading the .jar to the remote server...")
        val sshCmd = Process(Seq(
          "ssh",
          s"${instance}.soaringmeteo.org",
          "D=`mktemp -d`; tar xf - --directory=$D; sudo su -c $D/update.sh soarv2"
        ))
        ((makeArchiveCmd #| sshCmd) ! sbtOut).ensuring(_ == 0)
      }
    }
  )

}
